import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, filialId?: string) {
    return this.getResumo(tenantId, filialId);
  }

  async getResumo(tenantId: string, filialId?: string) {
    const agora = new Date();
    const inicioHoje = new Date(agora); inicioHoje.setHours(0, 0, 0, 0);
    const fimHoje = new Date(agora); fimHoje.setHours(23, 59, 59, 999);
    const em5dias = new Date(agora); em5dias.setDate(em5dias.getDate() + 5);
    const em7dias = new Date(agora); em7dias.setDate(em7dias.getDate() + 7);
    const filFiltro = filialId ? { filialId } : {};
    const pedFiltro = filialId ? { filialOrigemId: filialId } : {};

    const [
      itensEstoque, alertasValidade, porStatus, nfesHoje, faturadoHoje,
      crAgg, movimentacoesHoje, entradasHoje, romaneiosDia, nfes7d,
    ] = await Promise.all([
      this.prisma.estoqueSaldo.count({ where: { tenantId, ...filFiltro, quantidade: { gt: 0 } } }),
      this.prisma.estoqueSaldo.count({ where: { tenantId, ...filFiltro, quantidade: { gt: 0 }, lote: { dataValidade: { lte: em5dias } } } }),
      this.prisma.pedido.groupBy({ by: ['status'], where: { tenantId, ...pedFiltro }, _count: true }),
      this.prisma.nFe.count({ where: { tenantId, ...filFiltro, status: 'EMITIDO', dataEmissao: { gte: inicioHoje, lte: fimHoje } } }),
      this.prisma.nFe.aggregate({ _sum: { valorNfe: true }, where: { tenantId, ...filFiltro, status: 'EMITIDO', dataEmissao: { gte: inicioHoje, lte: fimHoje } } }),
      this.prisma.contaReceber.aggregate({ _count: true, _sum: { valorOriginal: true, valorPago: true }, where: { tenantId, ...(filialId && { filialId }), status: { in: ['ABERTO', 'PARCIAL', 'VENCIDO'] }, dataVencimento: { lte: em7dias } } }),
      this.prisma.movimentacaoEstoque.count({ where: { tenantId, ...filFiltro, dataMovimento: { gte: inicioHoje, lte: fimHoje } } }),
      this.prisma.entradaMercadoria.count({ where: { tenantId, dataEntrada: { gte: inicioHoje, lte: fimHoje } } }),
      this.prisma.romaneio.count({ where: { tenantId, ...filFiltro, dataEntrega: { gte: inicioHoje, lte: fimHoje } } }),
      this.prisma.nFe.findMany({
        where: { tenantId, ...filFiltro, status: 'EMITIDO', dataEmissao: { gte: new Date(inicioHoje.getTime() - 6 * 86400000) } },
        select: { dataEmissao: true, valorNfe: true },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const g of porStatus) statusMap[g.status] = (g as any)._count;

    const serie: { dia: string; label: string; valor: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(inicioHoje.getTime() - i * 86400000);
      const iso = d.toISOString().slice(0, 10);
      serie.push({ dia: iso, label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, valor: 0 });
    }
    for (const n of nfes7d) {
      const iso = n.dataEmissao?.toISOString().slice(0, 10);
      const item = serie.find((s) => s.dia === iso);
      if (item) item.valor += Number(n.valorNfe);
    }

    const receberEmAberto = Number(crAgg._sum.valorOriginal || 0) - Number(crAgg._sum.valorPago || 0);

    return {
      kpis: {
        itensEstoque,
        alertasValidade,
        pedidosPendentes: statusMap['CONFIRMADO'] || 0,
        pedidosSeparacao: statusMap['EM_SEPARACAO'] || 0,
        pedidosSeparados: statusMap['SEPARADO'] || 0,
        nfesHoje,
        faturadoHoje: Number(faturadoHoje._sum.valorNfe || 0),
        contasReceberQtd: (crAgg as any)._count || 0,
        contasReceberValor: receberEmAberto,
        movimentacoesHoje,
      },
      pedidosPorStatus: {
        CONFIRMADO: statusMap['CONFIRMADO'] || 0,
        EM_SEPARACAO: statusMap['EM_SEPARACAO'] || 0,
        SEPARADO: statusMap['SEPARADO'] || 0,
        FATURADO: statusMap['FATURADO'] || 0,
      },
      serieFaturamento: serie,
      fluxoDia: {
        entradas: entradasHoje,
        faturados: nfesHoje,
        romaneios: romaneiosDia,
        entregues: statusMap['ENTREGUE'] || 0,
      },
    };
  }
}
