import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DreService } from '../dre/dre.service';

type Periodo = 'hoje' | 'semana' | 'mes';

const n = (v: any) => Number(v) || 0;
const r2 = (v: number) => Math.round(v * 100) / 100;
const delta = (atual: number, ant: number) =>
  ant > 0 ? r2(((atual - ant) / ant) * 100) : atual > 0 ? 100 : 0;

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService, private dre: DreService) {}

  async findAll(tenantId: string, filialId?: string, periodo: Periodo = 'hoje') {
    return this.getDashboard(tenantId, filialId, periodo);
  }

  /** Janela do período atual + a janela anterior de mesmo tamanho + nº de dias da série. */
  private janela(periodo: Periodo) {
    const agora = new Date();
    const fim = new Date(agora); fim.setHours(23, 59, 59, 999);
    let inicio: Date, inicioAnt: Date, fimAnt: Date, serieDias: number, label: string;

    if (periodo === 'mes') {
      inicio = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0, 0);
      inicioAnt = new Date(agora.getFullYear(), agora.getMonth() - 1, 1, 0, 0, 0, 0);
      fimAnt = new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59, 999);
      serieDias = 30; label = 'Mês';
    } else if (periodo === 'semana') {
      inicio = new Date(agora); inicio.setDate(inicio.getDate() - 6); inicio.setHours(0, 0, 0, 0);
      inicioAnt = new Date(inicio); inicioAnt.setDate(inicioAnt.getDate() - 7);
      fimAnt = new Date(inicio); fimAnt.setMilliseconds(-1);
      serieDias = 7; label = '7 dias';
    } else {
      inicio = new Date(agora); inicio.setHours(0, 0, 0, 0);
      inicioAnt = new Date(inicio); inicioAnt.setDate(inicioAnt.getDate() - 1);
      fimAnt = new Date(inicio); fimAnt.setMilliseconds(-1);
      serieDias = 7; label = 'Hoje';
    }
    return { inicio, fim, inicioAnt, fimAnt, serieDias, label };
  }

  async getDashboard(tenantId: string, filialId?: string, periodo: Periodo = 'hoje') {
    const { inicio, fim, inicioAnt, fimAnt, serieDias, label } = this.janela(periodo);
    const agora = new Date();
    const em3 = new Date(agora); em3.setDate(em3.getDate() + 3);
    const em7 = new Date(agora); em7.setDate(em7.getDate() + 7);
    const filF = filialId ? { filialId } : {};
    const pedF = filialId ? { filialOrigemId: filialId } : {};

    const [
      fatPeriodo, fatAnterior, nfesPeriodo, porStatus,
      saldos, validadeSaldos, movsSaida, perdas,
      crAbertas, cpAbertas, nfesSerie, clientesFat, movimentacoesPeriodo,
      entradasPeriodo, romaneiosPeriodo, produtosAtivos, produtosComSaldo,
      dreRes,
    ] = await Promise.all([
      this.prisma.nFe.aggregate({ _sum: { valorNfe: true }, _count: true, where: { tenantId, ...filF, status: 'EMITIDO', dataEmissao: { gte: inicio, lte: fim } } }),
      this.prisma.nFe.aggregate({ _sum: { valorNfe: true }, _count: true, where: { tenantId, ...filF, status: 'EMITIDO', dataEmissao: { gte: inicioAnt, lte: fimAnt } } }),
      this.prisma.nFe.count({ where: { tenantId, ...filF, status: 'EMITIDO', dataEmissao: { gte: inicio, lte: fim } } }),
      this.prisma.pedido.groupBy({ by: ['status'], where: { tenantId, ...pedF }, _count: true }),
      this.prisma.estoqueSaldo.findMany({ where: { tenantId, ...filF, quantidade: { gt: 0 } }, select: { quantidade: true, custoMedio: true } }),
      this.prisma.estoqueSaldo.findMany({ where: { tenantId, ...filF, quantidade: { gt: 0 }, lote: { dataValidade: { lte: em7 } } }, select: { quantidade: true, custoMedio: true, lote: { select: { dataValidade: true } } } }),
      this.prisma.movimentacaoEstoque.findMany({ where: { tenantId, ...filF, tipo: 'SAIDA_VENDA', dataMovimento: { gte: inicio, lte: fim } }, select: { produtoId: true, quantidade: true, custoUnitario: true } }),
      this.prisma.movimentacaoEstoque.findMany({ where: { tenantId, ...filF, tipo: { in: ['PERDA', 'AVARIA'] }, dataMovimento: { gte: inicio, lte: fim } }, select: { quantidade: true, custoUnitario: true } }),
      this.prisma.contaReceber.findMany({ where: { tenantId, ...(filialId && { filialId }), status: { in: ['ABERTO', 'PARCIAL', 'VENCIDO'] } }, select: { valorOriginal: true, valorPago: true, dataVencimento: true } }),
      this.prisma.contaPagar.findMany({ where: { tenantId, ...(filialId && { filialId }), status: { in: ['ABERTO', 'PARCIAL', 'VENCIDO'] } }, select: { valorOriginal: true, valorPago: true, dataVencimento: true } }),
      this.prisma.nFe.findMany({ where: { tenantId, ...filF, status: 'EMITIDO', dataEmissao: { gte: new Date(new Date().setHours(0, 0, 0, 0) - (serieDias - 1) * 86400000) } }, select: { dataEmissao: true, valorNfe: true } }),
      this.prisma.nFe.groupBy({ by: ['clienteId'], where: { tenantId, ...filF, status: 'EMITIDO', dataEmissao: { gte: inicio, lte: fim }, clienteId: { not: null } }, _sum: { valorNfe: true }, _count: true }),
      this.prisma.movimentacaoEstoque.count({ where: { tenantId, ...filF, dataMovimento: { gte: inicio, lte: fim } } }),
      this.prisma.entradaMercadoria.count({ where: { tenantId, dataEntrada: { gte: inicio, lte: fim } } }),
      this.prisma.romaneio.count({ where: { tenantId, ...filF, dataEntrega: { gte: inicio, lte: fim } } }),
      this.prisma.produto.count({ where: { tenantId, ativo: true } }),
      this.prisma.estoqueSaldo.groupBy({ by: ['produtoId'], where: { tenantId, ...filF, quantidade: { gt: 0 } } }),
      this.dre.gerar(tenantId, { filialId, dataInicio: inicio.toISOString(), dataFim: fim.toISOString() }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const g of porStatus) statusMap[g.status] = (g as any)._count;

    // ── Financeiro ──
    const faturamento = n(fatPeriodo._sum.valorNfe);
    const faturamentoAnt = n(fatAnterior._sum.valorNfe);
    const ticketMedio = nfesPeriodo > 0 ? r2(faturamento / nfesPeriodo) : 0;

    const aging = (contas: { valorOriginal: any; valorPago: any; dataVencimento: Date }[]) => {
      const b = { vencido: 0, ate7: 0, ate30: 0, mais30: 0, total: 0, qtd: contas.length };
      for (const c of contas) {
        const saldo = n(c.valorOriginal) - n(c.valorPago);
        if (saldo <= 0) continue;
        b.total += saldo;
        const dias = Math.floor((c.dataVencimento.getTime() - agora.getTime()) / 86400000);
        if (dias < 0) b.vencido += saldo;
        else if (dias <= 7) b.ate7 += saldo;
        else if (dias <= 30) b.ate30 += saldo;
        else b.mais30 += saldo;
      }
      for (const k of Object.keys(b) as (keyof typeof b)[]) if (k !== 'qtd') b[k] = r2(b[k] as number);
      return b;
    };
    const receber = aging(crAbertas);
    const pagar = aging(cpAbertas);
    const inadimplenciaPct = receber.total > 0 ? r2((receber.vencido / receber.total) * 100) : 0;
    const saldoProjetado = r2(receber.total - pagar.total);

    // ── Estoque ──
    const valorEstoque = r2(saldos.reduce((s, x) => s + n(x.quantidade) * n(x.custoMedio), 0));
    const validade = { vencido: 0, ate3: 0, ate7: 0 };
    for (const x of validadeSaldos) {
      const dv = x.lote?.dataValidade; if (!dv) continue;
      const dias = Math.floor((dv.getTime() - agora.getTime()) / 86400000);
      if (dias < 0) validade.vencido++;
      else if (dias <= 3) validade.ate3++;
      else if (dias <= 7) validade.ate7++;
    }
    const perdaValor = r2(perdas.reduce((s, m) => s + n(m.quantidade) * n(m.custoUnitario), 0));
    const perdaQtd = r2(perdas.reduce((s, m) => s + n(m.quantidade), 0));
    const rupturas = Math.max(0, produtosAtivos - produtosComSaldo.length);

    // ── Top produtos (saídas por qtd + custo) ──
    const prodAgg = new Map<string, { qtd: number; custo: number }>();
    for (const m of movsSaida) {
      if (!m.produtoId) continue;
      const cur = prodAgg.get(m.produtoId) || { qtd: 0, custo: 0 };
      cur.qtd += n(m.quantidade);
      cur.custo += n(m.quantidade) * n(m.custoUnitario);
      prodAgg.set(m.produtoId, cur);
    }
    const topProdIds = [...prodAgg.entries()].sort((a, b) => b[1].custo - a[1].custo).slice(0, 8);
    const produtos = topProdIds.length
      ? await this.prisma.produto.findMany({ where: { id: { in: topProdIds.map(([id]) => id) } }, select: { id: true, codigo: true, descricao: true } })
      : [];
    const topProdutos = topProdIds.map(([id, v]) => {
      const p = produtos.find((x) => x.id === id);
      return { produtoId: id, codigo: p?.codigo || '—', descricao: p?.descricao || 'Produto', qtd: r2(v.qtd), custo: r2(v.custo) };
    });

    // ── Top clientes (faturamento no período) ──
    const cliIds = clientesFat.map((c) => c.clienteId!).filter(Boolean);
    const clientes = cliIds.length
      ? await this.prisma.cliente.findMany({ where: { id: { in: cliIds } }, select: { id: true, razaoSocial: true, nomeFantasia: true } })
      : [];
    const topClientes = clientesFat
      .map((c) => {
        const cli = clientes.find((x) => x.id === c.clienteId);
        return { clienteId: c.clienteId, nome: cli?.nomeFantasia || cli?.razaoSocial || 'Cliente', valor: r2(n(c._sum.valorNfe)), pedidos: (c as any)._count };
      })
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);

    // ── Série de faturamento (por dia) ──
    const base = new Date(); base.setHours(0, 0, 0, 0);
    const serie: { dia: string; label: string; valor: number }[] = [];
    for (let i = serieDias - 1; i >= 0; i--) {
      const d = new Date(base.getTime() - i * 86400000);
      serie.push({ dia: d.toISOString().slice(0, 10), label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, valor: 0 });
    }
    for (const nf of nfesSerie) {
      const iso = nf.dataEmissao?.toISOString().slice(0, 10);
      const item = serie.find((s) => s.dia === iso);
      if (item) item.valor = r2(item.valor + n(nf.valorNfe));
    }

    return {
      periodo, periodoLabel: label,
      // KPIs legados (compat) + novos
      kpis: {
        itensEstoque: produtosComSaldo.length,
        valorEstoque,
        alertasValidade: validade.vencido + validade.ate3 + validade.ate7,
        pedidosPendentes: statusMap['CONFIRMADO'] || 0,
        pedidosSeparacao: statusMap['EM_SEPARACAO'] || 0,
        pedidosSeparados: statusMap['SEPARADO'] || 0,
        nfesHoje: nfesPeriodo,
        faturadoHoje: faturamento,
        contasReceberQtd: receber.qtd,
        contasReceberValor: receber.total,
        movimentacoesHoje: movimentacoesPeriodo,
        perdaHojeValor: perdaValor,
        perdaHojeQtd: perdaQtd,
      },
      financeiro: {
        faturamento, faturamentoAnterior: faturamentoAnt, faturamentoDelta: delta(faturamento, faturamentoAnt),
        nfes: nfesPeriodo, nfesAnterior: (fatAnterior as any)._count || 0,
        ticketMedio,
        margemBruta: dreRes.kpis.margemBruta,
        cmv: dreRes.kpis.cmv,
        resultadoOperacional: dreRes.kpis.resultado,
        receber, pagar, inadimplenciaPct, saldoProjetado,
      },
      estoque: { itensComSaldo: produtosComSaldo.length, valorEstoque, validade, perdaValor, perdaQtd, rupturas, produtosAtivos },
      topClientes,
      topProdutos,
      pedidosPorStatus: {
        RASCUNHO: statusMap['RASCUNHO'] || 0,
        CONFIRMADO: statusMap['CONFIRMADO'] || 0,
        EM_SEPARACAO: statusMap['EM_SEPARACAO'] || 0,
        SEPARADO: statusMap['SEPARADO'] || 0,
        FATURADO: statusMap['FATURADO'] || 0,
        ENTREGUE: statusMap['ENTREGUE'] || 0,
        CANCELADO: statusMap['CANCELADO'] || 0,
      },
      serieFaturamento: serie,
      fluxoDia: {
        entradas: entradasPeriodo,
        faturados: nfesPeriodo,
        romaneios: romaneiosPeriodo,
        entregues: statusMap['ENTREGUE'] || 0,
      },
    };
  }
}
