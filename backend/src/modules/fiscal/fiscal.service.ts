import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Motor de Regras Fiscais e Tributárias.
 *
 * Responsável por:
 *  1. Resolver a regra fiscal aplicável a um item (matriz por NCM/UF/operação).
 *  2. Calcular CFOP, CST/CSOSN, bases e valores de ICMS, ICMS-ST, IPI, PIS e COFINS.
 *  3. Rodar o checklist anti-erro antes do faturamento.
 *
 * Modo de teste: os números são calculados de verdade, mas nada é transmitido à SEFAZ.
 */

export interface ImpostoItem {
  cfop: string;
  cstCsosn: string;
  origemProd: string;
  // ICMS
  baseCalcIcms: number;
  aliquotaIcms: number;
  valorIcms: number;
  // ICMS-ST
  baseCalcIcmsSt: number;
  valorIcmsSt: number;
  // IPI
  cstIpi: string | null;
  aliquotaIpi: number;
  valorIpi: number;
  // PIS
  cstPis: string;
  baseCalcPis: number;
  aliquotaPis: number;
  valorPis: number;
  // COFINS
  cstCofins: string;
  baseCalcCofins: number;
  aliquotaCofins: number;
  valorCofins: number;
  // DIFAL
  valorDifal: number;
  // Origem da regra (para auditoria/preview)
  regraId: string | null;
  regraDescricao: string;
}

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const pct = (v: number, aliq: number) => r2((Number(v) || 0) * (Number(aliq) || 0) / 100);

@Injectable()
export class FiscalService {
  private readonly logger = new Logger(FiscalService.name);

  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────
  // 1. RESOLUÇÃO DA REGRA (matriz fiscal)
  // ─────────────────────────────────────────

  /**
   * Encontra a melhor RegraFiscal para o contexto. Match por especificidade:
   * NCM exato > NCM prefixo > curinga; UF destino específica > curinga;
   * desempate por `prioridade` (maior primeiro).
   */
  async resolverRegra(
    tenantId: string,
    ctx: { ncm?: string; ufDestino?: string; tipoOperacao?: string; consumidorFinal?: boolean },
  ) {
    const tipoOperacao = ctx.tipoOperacao || 'VENDA';
    const regras = await this.prisma.regraFiscal.findMany({
      where: { tenantId, ativo: true, tipoOperacao },
    });

    const candidatas = regras
      .map((rg) => {
        let score = 0;
        // NCM
        if (rg.ncm) {
          if (!ctx.ncm) return null;
          if (rg.ncm === ctx.ncm) score += 100;
          else if (ctx.ncm.startsWith(rg.ncm)) score += 50 + rg.ncm.length;
          else return null;
        }
        // UF destino
        if (rg.ufDestino) {
          if (rg.ufDestino !== ctx.ufDestino) return null;
          score += 30;
        }
        // Consumidor final
        if (rg.consumidorFinal !== null && rg.consumidorFinal !== undefined) {
          if (rg.consumidorFinal !== !!ctx.consumidorFinal) return null;
          score += 10;
        }
        score += rg.prioridade;
        return { rg, score };
      })
      .filter(Boolean) as { rg: any; score: number }[];

    candidatas.sort((a, b) => b.score - a.score);
    return candidatas[0]?.rg || null;
  }

  // ─────────────────────────────────────────
  // 2. CÁLCULO DE IMPOSTOS (por item)
  // ─────────────────────────────────────────

  /**
   * Calcula os impostos de um item. Usa a RegraFiscal se houver; senão cai para
   * as alíquotas/CST cadastrados no próprio produto (fallback seguro).
   */
  calcularItem(params: {
    valorItem: number;           // valor da mercadoria (qtd × unit − desconto)
    interestadual: boolean;
    consumidorFinal: boolean;
    tipoOperacao: string;        // VENDA, DEVOLUCAO...
    regra: any | null;
    produto: { ncm: string; cfop?: string | null; origem?: string; cstIcms?: string | null;
      aliquotaIcms?: any; aliquotaPis?: any; aliquotaCofins?: any; cstPis?: string | null; cstCofins?: string | null };
  }): ImpostoItem {
    const { valorItem, interestadual, consumidorFinal, regra, produto, tipoOperacao } = params;
    const dev = tipoOperacao === 'DEVOLUCAO';

    // ---- CFOP ----
    let cfop: string;
    if (regra) {
      cfop = interestadual ? regra.cfopInterestadual : regra.cfopInterno;
    } else if (dev) {
      cfop = interestadual ? '6202' : '5202'; // devolução de venda
    } else {
      cfop = produto.cfop || (interestadual ? '6102' : '5102');
    }

    // ---- ICMS ----
    // origem: 0=nacional ... 8=importado. Da regra, ou do produto (enum NACIONAL_0 → "0").
    const origemProd = String(regra?.origemProd ?? produto.origem ?? '0').replace(/\D/g, '').slice(-1) || '0';
    const cstCsosn = regra?.cstIcms ?? produto.cstIcms ?? '102';
    const aliquotaIcms = Number(regra?.aliquotaIcms ?? produto.aliquotaIcms ?? 0);
    const reducao = Number(regra?.reducaoBaseIcms ?? 0);
    const baseCalcIcms = r2(valorItem * (1 - reducao / 100));
    // CSOSN do Simples sem crédito (102/103/300/400) → ICMS destacado 0
    const icmsDestacado = ['00', '10', '20', '70', '90'].includes(cstCsosn);
    const valorIcms = icmsDestacado ? pct(baseCalcIcms, aliquotaIcms) : 0;

    // ---- ICMS-ST ----
    let baseCalcIcmsSt = 0;
    let valorIcmsSt = 0;
    if (regra?.temSt) {
      const mva = Number(regra.mvaSt || 0);
      const aliqSt = Number(regra.aliquotaIcmsSt || 0);
      baseCalcIcmsSt = r2(valorItem * (1 + mva / 100));
      valorIcmsSt = Math.max(0, r2(pct(baseCalcIcmsSt, aliqSt) - valorIcms));
    }

    // ---- IPI ----
    const cstIpi = regra?.cstIpi ?? null;
    const aliquotaIpi = Number(regra?.aliquotaIpi ?? 0);
    const valorIpi = pct(valorItem, aliquotaIpi);

    // ---- PIS ----
    const cstPis = regra?.cstPis ?? produto.cstPis ?? '07';
    const aliquotaPis = Number(regra?.aliquotaPis ?? produto.aliquotaPis ?? 0);
    const valorPis = pct(valorItem, aliquotaPis);

    // ---- COFINS ----
    const cstCofins = regra?.cstCofins ?? produto.cstCofins ?? '07';
    const aliquotaCofins = Number(regra?.aliquotaCofins ?? produto.aliquotaCofins ?? 0);
    const valorCofins = pct(valorItem, aliquotaCofins);

    // ---- DIFAL (consumidor final, interestadual) ----
    let valorDifal = 0;
    if (regra?.temDifal && interestadual && consumidorFinal) {
      // diferença simplificada: (alíq interna destino − interestadual) sobre a base
      const aliqInterna = aliquotaIcms || 18;
      const aliqInter = 12;
      valorDifal = Math.max(0, pct(baseCalcIcms, aliqInterna - aliqInter));
    }

    return {
      cfop,
      cstCsosn,
      origemProd,
      baseCalcIcms: icmsDestacado ? baseCalcIcms : 0,
      aliquotaIcms,
      valorIcms,
      baseCalcIcmsSt,
      valorIcmsSt,
      cstIpi,
      aliquotaIpi,
      valorIpi,
      cstPis,
      baseCalcPis: valorItem,
      aliquotaPis,
      valorPis,
      cstCofins,
      baseCalcCofins: valorItem,
      aliquotaCofins,
      valorCofins,
      valorDifal,
      regraId: regra?.id || null,
      regraDescricao: regra?.descricao || 'Padrão (produto)',
    };
  }

  /**
   * Calcula os impostos de TODOS os itens de um pedido já carregado (com cliente,
   * itens→produto e filialOrigem). Devolve itens enriquecidos + totais consolidados.
   */
  async calcularPedido(
    tenantId: string,
    pedido: any,
    opts: { tipoOperacao?: string } = {},
  ) {
    const tipoOperacao = opts.tipoOperacao || 'VENDA';
    const ufOrigem = (pedido.filialOrigem?.endereco as any)?.uf || 'SP';
    const ufDestino = (pedido.cliente?.enderecoJson as any)?.uf || ufOrigem;
    const interestadual = ufOrigem !== ufDestino;
    // Consumidor final = cliente sem IE (não contribuinte)
    const consumidorFinal = !pedido.cliente?.ie || pedido.cliente?.ie?.toUpperCase() === 'ISENTO';

    const itens = [] as any[];
    for (const item of pedido.itens) {
      const valorItem = Number(item.valorTotal);
      const regra = await this.resolverRegra(tenantId, {
        ncm: item.produto?.ncm,
        ufDestino,
        tipoOperacao,
        consumidorFinal,
      });
      const imp = this.calcularItem({
        valorItem,
        interestadual,
        consumidorFinal,
        tipoOperacao,
        regra,
        produto: item.produto,
      });
      itens.push({ item, imposto: imp });
    }

    const totais = itens.reduce(
      (acc, { imposto }) => ({
        baseIcms: r2(acc.baseIcms + imposto.baseCalcIcms),
        valorIcms: r2(acc.valorIcms + imposto.valorIcms),
        valorIcmsSt: r2(acc.valorIcmsSt + imposto.valorIcmsSt),
        valorIpi: r2(acc.valorIpi + imposto.valorIpi),
        valorPis: r2(acc.valorPis + imposto.valorPis),
        valorCofins: r2(acc.valorCofins + imposto.valorCofins),
        valorDifal: r2(acc.valorDifal + imposto.valorDifal),
      }),
      { baseIcms: 0, valorIcms: 0, valorIcmsSt: 0, valorIpi: 0, valorPis: 0, valorCofins: 0, valorDifal: 0 },
    );

    return { itens, totais, contexto: { ufOrigem, ufDestino, interestadual, consumidorFinal } };
  }

  // ─────────────────────────────────────────
  // 3. VALIDAÇÃO ANTI-ERRO (checklist pré-faturamento)
  // ─────────────────────────────────────────

  /**
   * Roda o checklist antes de faturar. Devolve uma lista de checagens; cada uma
   * com ok=true/false e severidade (BLOQUEIO impede faturar, AVISO só alerta).
   */
  async validarFaturamento(tenantId: string, pedidoId: string) {
    const pedido = await this.prisma.pedido.findFirst({
      where: { id: pedidoId, tenantId },
      include: {
        cliente: true,
        filialOrigem: true,
        itens: { include: { produto: true } },
      },
    });
    if (!pedido) throw new NotFoundException('Pedido não encontrado.');

    const checks: { id: string; label: string; ok: boolean; severidade: 'BLOQUEIO' | 'AVISO'; detalhe?: string }[] = [];
    const add = (id: string, label: string, ok: boolean, severidade: 'BLOQUEIO' | 'AVISO', detalhe?: string) =>
      checks.push({ id, label, ok, severidade, detalhe });

    // a) Status do pedido
    add('status', 'Pedido liberado para faturamento', ['SEPARADO', 'CONFIRMADO'].includes(pedido.status), 'BLOQUEIO',
      `Status atual: ${pedido.status}`);

    // b) Cliente
    const cli = pedido.cliente;
    add('cliente', 'Cliente vinculado ao pedido', !!cli, 'BLOQUEIO');
    add('cliente-ativo', 'Cliente ativo', !!cli?.ativo, 'BLOQUEIO');
    add('cnpj', 'CNPJ/CPF do cliente preenchido', !!cli?.cnpjCpf && cli.cnpjCpf.replace(/\D/g, '').length >= 11, 'BLOQUEIO',
      cli?.cnpjCpf || 'não informado');
    const endOk = !!(cli?.enderecoJson as any)?.uf && !!(cli?.enderecoJson as any)?.cidade;
    add('endereco', 'Endereço do cliente completo (cidade/UF)', endOk, 'BLOQUEIO');
    const pj = cli?.tipo === 'PJ';
    add('ie', 'Inscrição Estadual informada (ou ISENTO)', !pj || !!cli?.ie, 'AVISO',
      cli?.ie || 'sem IE — será tratado como consumidor final');
    add('sintegra', 'Cadastro validado no Sintegra/CCC', !!cli?.sintegraOk, 'AVISO',
      cli?.sintegraOk ? 'validado' : 'não validado (modo teste)');

    // c) Crédito
    add('credito', 'Sem bloqueio de crédito', !pedido.bloqueioCredito, 'BLOQUEIO', pedido.motivoBloqueio || undefined);

    // d) Itens e estoque
    add('itens', 'Pedido possui itens', pedido.itens.length > 0, 'BLOQUEIO');
    for (const item of pedido.itens) {
      if (item.cortado) continue;
      const saldos = await this.prisma.estoqueSaldo.findMany({
        where: { tenantId, filialId: pedido.filialOrigemId, produtoId: item.produtoId },
      });
      const disponivel = saldos.reduce((s, sd) => s + Number(sd.quantidade) - Number(sd.quantidadeReservada || 0), 0);
      // o pedido aprovado já reservou; basta o físico cobrir a quantidade
      const fisico = saldos.reduce((s, sd) => s + Number(sd.quantidade), 0);
      add(`estoque-${item.id}`, `Estoque de ${item.descricao}`, fisico >= Number(item.quantidade), 'AVISO',
        `físico ${fisico} · necessário ${item.quantidade}` + (disponivel < 0 ? ' (disponível negativo — a comprar)' : ''));
    }

    // e) NCM dos produtos
    const semNcm = pedido.itens.filter((i) => !i.produto?.ncm || i.produto.ncm.replace(/\D/g, '').length < 8);
    add('ncm', 'Todos os produtos com NCM válido (8 dígitos)', semNcm.length === 0, 'BLOQUEIO',
      semNcm.length ? `${semNcm.length} produto(s) sem NCM` : undefined);

    // f) Emitente (filial)
    add('emitente', 'Filial emitente com CNPJ', !!pedido.filialOrigem?.cnpj, 'BLOQUEIO');

    const bloqueios = checks.filter((c) => !c.ok && c.severidade === 'BLOQUEIO');
    const avisos = checks.filter((c) => !c.ok && c.severidade === 'AVISO');
    return {
      pedidoId,
      podeFaturar: bloqueios.length === 0,
      checks,
      bloqueios: bloqueios.length,
      avisos: avisos.length,
    };
  }

  // ─────────────────────────────────────────
  // 4. CRUD da MATRIZ FISCAL
  // ─────────────────────────────────────────

  listarRegras(tenantId: string) {
    return this.prisma.regraFiscal.findMany({
      where: { tenantId },
      orderBy: [{ ativo: 'desc' }, { prioridade: 'desc' }, { createdAt: 'asc' }],
    });
  }

  criarRegra(tenantId: string, dto: any) {
    return this.prisma.regraFiscal.create({ data: { ...this.sanitize(dto), tenantId } });
  }

  async atualizarRegra(tenantId: string, id: string, dto: any) {
    const existe = await this.prisma.regraFiscal.findFirst({ where: { id, tenantId } });
    if (!existe) throw new NotFoundException('Regra fiscal não encontrada.');
    return this.prisma.regraFiscal.update({ where: { id }, data: this.sanitize(dto) });
  }

  async removerRegra(tenantId: string, id: string) {
    const existe = await this.prisma.regraFiscal.findFirst({ where: { id, tenantId } });
    if (!existe) throw new NotFoundException('Regra fiscal não encontrada.');
    await this.prisma.regraFiscal.delete({ where: { id } });
    return { ok: true };
  }

  private sanitize(dto: any) {
    const decimais = ['aliquotaIcms', 'reducaoBaseIcms', 'mvaSt', 'aliquotaIcmsSt', 'aliquotaIpi', 'aliquotaPis', 'aliquotaCofins'];
    const out: any = { ...dto };
    delete out.id; delete out.tenantId; delete out.createdAt; delete out.updatedAt;
    for (const k of decimais) if (out[k] !== undefined) out[k] = Number(out[k]) || 0;
    if (out.prioridade !== undefined) out.prioridade = Number(out.prioridade) || 0;
    return out;
  }

  /**
   * Cria um conjunto de regras-padrão pra começar (FLV no Simples Nacional, SP).
   * Idempotente: só semeia se a matriz estiver vazia.
   */
  async seedPadrao(tenantId: string) {
    const qtd = await this.prisma.regraFiscal.count({ where: { tenantId } });
    if (qtd > 0) return { criadas: 0, jaExistiam: qtd };

    const regras = [
      {
        descricao: 'FLV — venda interna SP (Simples, isento ICMS)',
        ncm: null, ufDestino: 'SP', tipoOperacao: 'VENDA', consumidorFinal: null,
        cfopInterno: '5102', cfopInterestadual: '6102',
        cstIcms: '102', aliquotaIcms: 0, cstPis: '07', aliquotaPis: 0, cstCofins: '07', aliquotaCofins: 0,
        prioridade: 10,
      },
      {
        descricao: 'Venda interestadual (Simples)',
        ncm: null, ufDestino: null, tipoOperacao: 'VENDA', consumidorFinal: false,
        cfopInterno: '5102', cfopInterestadual: '6102',
        cstIcms: '102', aliquotaIcms: 0, cstPis: '07', aliquotaPis: 0, cstCofins: '07', aliquotaCofins: 0,
        prioridade: 5,
      },
      {
        descricao: 'Devolução de venda',
        ncm: null, ufDestino: null, tipoOperacao: 'DEVOLUCAO', consumidorFinal: null,
        cfopInterno: '5202', cfopInterestadual: '6202',
        cstIcms: '102', aliquotaIcms: 0, cstPis: '07', aliquotaPis: 0, cstCofins: '07', aliquotaCofins: 0,
        prioridade: 5,
      },
    ];
    await this.prisma.regraFiscal.createMany({ data: regras.map((r) => ({ ...r, tenantId })) });
    return { criadas: regras.length };
  }
}
