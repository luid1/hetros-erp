import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StatusDFe, TipoMovimentacao } from '@prisma/client';
import { money, sumMoney } from '../../common/utils/money.util';

export interface DreLinha {
  chave: string;
  label: string;
  valor: number;                 // negativo em deduções/custos/despesas
  tipo: 'receita' | 'deducao' | 'resultado' | 'custo';
  destaque?: boolean;
}

/**
 * DRE realizada (P0-5 → real). Monta a Demonstração de Resultado a partir dos
 * fatos já registrados no ERP, em regime de competência pela data do documento:
 *
 *  - Receita Bruta ....... NF-e EMITIDAS (valorProdutos) no período
 *  - (-) Deduções ........ impostos sobre venda da NF-e (ICMS + ICMS-ST + PIS + COFINS)
 *  - (=) Receita Líquida
 *  - (-) CMV ............. custo das movimentações de SAÍDA por venda (custoUnitário × qtd)
 *  - (=) Lucro Bruto
 *  - (-) Perdas/Quebras .. custo das movimentações PERDA/AVARIA
 *  - (=) Resultado Operacional
 *
 * Observação honesta: despesas administrativas/operacionais fora do CMV dependem
 * de um Plano de Contas com lançamentos classificados — que ainda não é alimentado
 * pelo fluxo. Enquanto isso, o DRE mostra o que é rastreável de fato (sem inventar).
 */
@Injectable()
export class DreService {
  constructor(private prisma: PrismaService) {}

  /** Compat: a rota antiga `GET /dre` retorna só as linhas. */
  async findAll(tenantId: string, filtros?: { filialId?: string; dataInicio?: string; dataFim?: string }) {
    const { linhas } = await this.gerar(tenantId, filtros);
    return linhas;
  }

  async gerar(tenantId: string, filtros?: { filialId?: string; dataInicio?: string; dataFim?: string }) {
    const { inicio, fim, label } = this.resolverPeriodo(filtros);
    const filialId = filtros?.filialId || undefined;

    // 1. Receita bruta + impostos (NF-e emitidas no período).
    const nfes = await this.prisma.nFe.findMany({
      where: {
        tenantId,
        ...(filialId ? { filialId } : {}),
        status: StatusDFe.EMITIDO,
        dataEmissao: { gte: inicio, lte: fim },
      },
      select: {
        valorProdutos: true, valorIcms: true, valorIcmsSt: true,
        valorPis: true, valorCofins: true,
      },
    });

    const receitaBruta = sumMoney(nfes.map((n) => n.valorProdutos));
    const deducoes = sumMoney(
      nfes.flatMap((n) => [n.valorIcms, n.valorIcmsSt, n.valorPis, n.valorCofins]),
    );
    const receitaLiquida = money(receitaBruta - deducoes);

    // 2. CMV — custo das saídas por venda no período.
    const saidas = await this.prisma.movimentacaoEstoque.findMany({
      where: {
        tenantId,
        ...(filialId ? { filialId } : {}),
        tipo: TipoMovimentacao.SAIDA_VENDA,
        dataMovimento: { gte: inicio, lte: fim },
      },
      select: { quantidade: true, custoUnitario: true },
    });
    const cmv = sumMoney(saidas.map((m) => Number(m.quantidade) * Number(m.custoUnitario)));
    const lucroBruto = money(receitaLiquida - cmv);

    // 3. Perdas e quebras — custo das movimentações PERDA/AVARIA.
    const perdasMov = await this.prisma.movimentacaoEstoque.findMany({
      where: {
        tenantId,
        ...(filialId ? { filialId } : {}),
        tipo: { in: [TipoMovimentacao.PERDA, TipoMovimentacao.AVARIA] },
        dataMovimento: { gte: inicio, lte: fim },
      },
      select: { quantidade: true, custoUnitario: true },
    });
    const perdas = sumMoney(perdasMov.map((m) => Number(m.quantidade) * Number(m.custoUnitario)));
    const resultado = money(lucroBruto - perdas);

    const margemBruta = receitaLiquida > 0 ? Math.round((lucroBruto / receitaLiquida) * 1000) / 10 : 0;

    const linhas: DreLinha[] = [
      { chave: 'receita_bruta', label: 'Receita Bruta de Vendas', valor: receitaBruta, tipo: 'receita', destaque: true },
      { chave: 'deducoes', label: '(-) Impostos sobre Vendas (ICMS/ST/PIS/COFINS)', valor: -deducoes, tipo: 'deducao' },
      { chave: 'receita_liquida', label: '(=) Receita Líquida', valor: receitaLiquida, tipo: 'resultado', destaque: true },
      { chave: 'cmv', label: '(-) CMV — Custo da Mercadoria Vendida', valor: -cmv, tipo: 'custo' },
      { chave: 'lucro_bruto', label: '(=) Lucro Bruto', valor: lucroBruto, tipo: 'resultado', destaque: true },
      { chave: 'perdas', label: '(-) Perdas e Quebras', valor: -perdas, tipo: 'custo' },
      { chave: 'resultado_operacional', label: '(=) Resultado Operacional', valor: resultado, tipo: 'resultado', destaque: true },
    ];

    return {
      periodo: { inicio, fim, label },
      linhas,
      kpis: { receitaBruta, deducoes, receitaLiquida, cmv, lucroBruto, perdas, resultado, margemBruta },
      cobertura: {
        nfesEmitidas: nfes.length,
        movimentacoesVenda: saidas.length,
        observacao:
          'DRE realizada a partir de NF-e emitidas e movimentações de estoque. Despesas ' +
          'administrativas/operacionais fora do CMV dependem do Plano de Contas (ainda não alimentado).',
      },
    };
  }

  /** Período: usa dataInicio/dataFim se informados; senão o mês corrente. */
  private resolverPeriodo(filtros?: { dataInicio?: string; dataFim?: string }) {
    const agora = new Date();
    const inicio = filtros?.dataInicio
      ? new Date(filtros.dataInicio)
      : new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0, 0);
    const fim = filtros?.dataFim
      ? new Date(filtros.dataFim)
      : new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999);
    const label = inicio.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return { inicio, fim, label };
  }
}
