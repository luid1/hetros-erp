import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CargaService {
  constructor(private prisma: PrismaService) {}

  private intervaloDia(data: string) {
    // Interpreta a data como dia LOCAL (evita o shift de fuso do `new Date('YYYY-MM-DD')` em UTC)
    const dia = data.split('T')[0];
    const inicio = new Date(`${dia}T00:00:00`);
    const fim = new Date(`${dia}T23:59:59.999`);
    return { inicio, fim };
  }

  /** Grade de pedidos do dia para Controle de Carga */
  async getGrade(tenantId: string, filialId: string, data: string, filtros: {
    segmento?: string;
    somentePendentes?: boolean;
    somenteEscolas?: boolean;
    mostrarFinalizados?: boolean;
  }) {
    const { inicio, fim } = this.intervaloDia(data);

    const pedidos = await this.prisma.pedido.findMany({
      where: {
        tenantId,
        filialOrigemId: filialId,
        dataEntrega: { gte: inicio, lte: fim },
        status: { in: ['CONFIRMADO', 'EM_SEPARACAO', 'SEPARADO', 'FATURADO'] },
      },
      include: {
        cliente: { select: { razaoSocial: true, nomeFantasia: true, cnpjCpf: true, enderecoJson: true } },
        romaneios: { include: { romaneio: { select: { numero: true, motorista: true } } } },
        _count: { select: { itens: true } },
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    return pedidos.map((p) => {
      const end: any = p.cliente?.enderecoJson || {};
      const rItem: any = (p as any).romaneios?.[0];
      const faturado = p.status === 'FATURADO';
      return {
        id: p.id,
        numero: p.numero,
        data: p.dataEntrega,
        nomeFantasia: p.cliente?.nomeFantasia || p.cliente?.razaoSocial || '—',
        referencia: String(p.numero).padStart(5, '0'),
        volumes: (p as any).volumes || 0,
        pesoKg: Number((p as any).pesoTotal || 0).toFixed(3),
        empresa: 'Hetr.',
        tipoFaturamento: p.tipo === 'VENDA' ? 'NFe' : p.tipo,
        status: faturado ? 'FIN' : '',
        statusPedido: p.status,
        statusCarga: faturado ? 'AURCARGA_OK' : rItem ? 'IMPRESSO' : 'IMPRESSAO_PENDENTE',
        roteirizado: !!rItem,
        qtdItens: (p as any)._count?.itens || 0,
        regiao: (p as any).regiao || '',
        cep: end.cep || '',
        bairro: end.bairro || '',
        subRegiao: '',
        onda: 1,
        periodo: (p as any).periodo || 'MANHA',
        rota: rItem?.romaneio?.numero ? String(rItem.romaneio.numero) : '',
        motorista: rItem?.romaneio?.motorista || '',
        andamento: 0,
        valorTotal: Number(p.valorTotal),
      };
    });
  }

  /** Rotas (romaneios) do dia — Entregas Programadas: só rotas já criadas */
  async getRotas(tenantId: string, filialId: string, data: string) {
    const { inicio, fim } = this.intervaloDia(data);

    const romaneios = await this.prisma.romaneio.findMany({
      where: { tenantId, filialId, dataEntrega: { gte: inicio, lte: fim } },
      include: {
        itens: {
          include: {
            pedido: {
              select: {
                id: true, numero: true, tipo: true, pesoTotal: true, valorTotal: true, periodo: true,
                cliente: { select: { razaoSocial: true, nomeFantasia: true } },
              },
            },
          },
          orderBy: { ordemEntrega: 'asc' },
        },
      },
      orderBy: { numero: 'asc' },
    });

    return romaneios.map((r) => ({
      id: r.id,
      numero: r.numero,
      motorista: r.motorista || '—',
      codigoCondutor: r.codigoCondutor,
      tipoVeiculo: r.tipoVeiculo || 'VAN',
      placaVeiculo: r.placaVeiculo,
      refrigerado: r.refrigerado,
      periodo: r.periodo || 'MANHA',
      status: r.status,
      pesoKg: (r.itens || []).reduce((s, i: any) => s + Number(i.pedido?.pesoTotal || 0), 0),
      valorTotal: (r.itens || []).reduce((s, i: any) => s + Number(i.pedido?.valorTotal || 0), 0),
      qtdEntregas: (r.itens || []).length,
      entregas: (r.itens || []).map((i: any) => ({
        pedidoId: i.pedidoId,
        numero: i.pedido?.numero,
        tipo: i.pedido?.tipo || 'VENDA',
        ordem: i.ordemEntrega,
        cliente: i.pedido?.cliente?.nomeFantasia || i.pedido?.cliente?.razaoSocial || '—',
        peso: Number(i.pedido?.pesoTotal || 0),
        valor: Number(i.pedido?.valorTotal || 0),
      })),
    }));
  }

  /** Totalizadores para o painel inferior */
  async getTotais(tenantId: string, filialId: string, data: string) {
    const rotas = await this.getRotas(tenantId, filialId, data);
    return {
      qtdRotas: rotas.length,
      pesoCargaKg: rotas.reduce((s, r) => s + r.pesoKg, 0),
      qtdEntregas: rotas.reduce((s, r) => s + r.qtdEntregas, 0),
      slaPercent: 0,
    };
  }

  /**
   * Cria uma rota (Romaneio) com os pedidos selecionados e o motorista/veículo.
   * É a "Capa de Rota". Persiste a roteirização.
   */
  async criarRomaneio(tenantId: string, dto: {
    filialId: string;
    motorista: string;
    codigoCondutor?: string;
    foneCondutor?: string;
    placaVeiculo?: string;
    modeloVeiculo?: string;
    tipoVeiculo?: string;
    refrigerado?: boolean;
    periodo?: string;
    regiaoRota?: string;
    dataMovimento?: string;
    dataEntrega?: string;
    valorFrete?: number;
    pedidoIds: string[];
  }) {
    const ultimo = await this.prisma.romaneio.findFirst({
      where: { tenantId, filialId: dto.filialId },
      orderBy: { numero: 'desc' },
      select: { numero: true },
    });
    const numero = (ultimo?.numero || 3500) + 1;
    const autorizacao = `${new Date().getFullYear()}${String(numero).padStart(6, '0')}`;

    const pesoTotal = await this.prisma.pedido.aggregate({
      where: { id: { in: dto.pedidoIds }, tenantId },
      _sum: { pesoTotal: true },
    });

    const romaneio = await this.prisma.$transaction(async (tx) => {
      const criado = await tx.romaneio.create({
        data: {
          tenantId,
          filialId: dto.filialId,
          numero,
          status: 'ABERTO',
          motorista: dto.motorista,
          codigoCondutor: dto.codigoCondutor,
          foneCondutor: dto.foneCondutor,
          placaVeiculo: dto.placaVeiculo,
          modeloVeiculo: dto.modeloVeiculo,
          tipoVeiculo: dto.tipoVeiculo,
          refrigerado: dto.refrigerado || false,
          periodo: dto.periodo,
          regiaoRota: dto.regiaoRota,
          autorizacaoCarga: autorizacao,
          pesoTotalKg: pesoTotal._sum.pesoTotal || 0,
          valorFrete: dto.valorFrete ? Number(dto.valorFrete) : 0,
          dataMovimento: dto.dataMovimento ? new Date(dto.dataMovimento) : new Date(),
          // ancora no meio-dia local para não escorregar de dia por fuso
          dataEntrega: dto.dataEntrega ? new Date(`${dto.dataEntrega.split('T')[0]}T12:00:00`) : undefined,
          itens: {
            create: dto.pedidoIds.map((pedidoId, idx) => ({ pedidoId, ordemEntrega: idx + 1 })),
          },
        },
        include: { itens: true },
      });

      // Roteirizou → pedidos entram automaticamente na fila de SEPARAÇÃO.
      // (Só promove os que ainda estão CONFIRMADO; não rebaixa SEPARADO/FATURADO.)
      await tx.pedido.updateMany({
        where: { id: { in: dto.pedidoIds }, tenantId, status: 'CONFIRMADO' },
        data: { status: 'EM_SEPARACAO' },
      });

      return criado;
    });

    return romaneio;
  }

  /** Capa de Rota completa para impressão */
  async getCapaRota(tenantId: string, romaneioId: string) {
    const r = await this.prisma.romaneio.findFirst({
      where: { id: romaneioId, tenantId },
      include: {
        filial: { select: { nome: true, codigo: true } },
        itens: {
          orderBy: { ordemEntrega: 'asc' },
          include: {
            pedido: {
              include: {
                cliente: { select: { razaoSocial: true, nomeFantasia: true, enderecoJson: true } },
              },
            },
          },
        },
      },
    });
    if (!r) throw new NotFoundException('Romaneio não encontrado.');

    const hhmm = (d: any) => (d ? new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');
    const pesoTotal = r.itens.reduce((s, i: any) => s + Number(i.pedido?.pesoTotal || 0), 0);

    return {
      id: r.id,
      idEntrega: r.numero,
      cd: r.filial?.nome || 'Hetros',
      empresa: `${r.filial?.codigo || ''}${r.filial?.codigo ? '-' : ''}${r.filial?.nome || 'Hetros'}`,
      // Rótulo da faixa: "35349 - DTC8J29 - HR - GILSON NASCIMENTO DE CARVALHO"
      rotaLabel: [r.numero, r.placaVeiculo, r.regiaoRota, r.motorista].filter(Boolean).join(' - '),
      motorista: r.motorista,
      codigoCondutor: r.codigoCondutor,
      foneCondutor: r.foneCondutor,
      placaVeiculo: r.placaVeiculo,
      modeloVeiculo: r.modeloVeiculo,
      dataMovimento: r.dataMovimento,
      dataCarga: r.dataMovimento || r.dataEntrega,
      dataEntrega: r.dataEntrega,
      regiaoRota: r.regiaoRota,
      autorizacaoCarga: r.autorizacaoCarga,
      qtdEntregas: r.itens.length,
      pesoTotalKg: Number(r.pesoTotalKg || pesoTotal),
      unidades: r.itens.map((i: any) => {
        const ped: any = i.pedido || {};
        const cli: any = ped.cliente || {};
        const end: any = cli.enderecoJson || {};
        return {
          bilhete: ped.numero ?? i.ordemEntrega,
          horaDe: hhmm(ped.janelaInicio),
          horaAte: hhmm(ped.janelaFim),
          familia: ped.familia || '',
          nomeCliente: cli.nomeFantasia || cli.razaoSocial || '—',
          endereco: [end.rua, end.numero, end.complemento].filter(Boolean).join(', '),
          bairroCidadeUf: [end.bairro, [end.cidade, end.uf].filter(Boolean).join(' - ')].filter(Boolean).join(' - '),
          tpFatura: ped.tipoFaturamento || 'NFE PADRAO',
          idVenda: ped.numero ?? '',
          pesoKg: Number(ped.pesoTotal || 0),
          ordem: i.ordemEntrega,
        };
      }),
    };
  }

  /**
   * Fechamento de Frete por motorista/rota (estilo planilha):
   * uma linha por romaneio com motorista, veículo, clientes, NF-E (soma) e frete.
   */
  async getFechamentoFrete(tenantId: string, filialId: string, data: string) {
    const { inicio, fim } = this.intervaloDia(data);
    const romaneios = await this.prisma.romaneio.findMany({
      where: { tenantId, filialId, dataEntrega: { gte: inicio, lte: fim } },
      include: {
        itens: {
          orderBy: { ordemEntrega: 'asc' },
          include: { pedido: { select: { valorTotal: true, cliente: { select: { nomeFantasia: true, razaoSocial: true } } } } },
        },
      },
      orderBy: { numero: 'asc' },
    });

    const linhas = romaneios.map((r) => {
      const nfeTotal = r.itens.reduce((s, i: any) => s + Number(i.pedido?.valorTotal || 0), 0);
      const frete = Number(r.valorFrete || 0);
      const clientes = r.itens
        .map((i: any) => i.pedido?.cliente?.nomeFantasia || i.pedido?.cliente?.razaoSocial || '—')
        .join(' / ');
      return {
        id: r.id,
        numero: r.numero,
        data: r.dataEntrega,
        motorista: r.motorista || '—',
        veiculo: r.tipoVeiculo || '—',
        placaVeiculo: r.placaVeiculo,
        clientes,
        qtdEntregas: r.itens.length,
        nfeTotal,
        valorFrete: frete,
        percentual: nfeTotal > 0 ? (frete / nfeTotal) * 100 : 0,
      };
    });

    const totalNfe = linhas.reduce((s, l) => s + l.nfeTotal, 0);
    const totalFrete = linhas.reduce((s, l) => s + l.valorFrete, 0);
    return {
      linhas,
      totais: {
        nfeTotal: totalNfe,
        valorFrete: totalFrete,
        percentual: totalNfe > 0 ? (totalFrete / totalNfe) * 100 : 0,
      },
    };
  }

  /** Lança/atualiza o valor do frete de uma rota */
  async setFrete(tenantId: string, romaneioId: string, valorFrete: number) {
    const r = await this.prisma.romaneio.findFirst({ where: { id: romaneioId, tenantId } });
    if (!r) throw new NotFoundException('Romaneio não encontrado.');
    return this.prisma.romaneio.update({
      where: { id: romaneioId },
      data: { valorFrete: valorFrete || 0 },
    });
  }

  /** Remove uma rota (desfaz a roteirização) */
  async excluirRomaneio(tenantId: string, romaneioId: string) {
    const r = await this.prisma.romaneio.findFirst({ where: { id: romaneioId, tenantId } });
    if (!r) throw new NotFoundException('Romaneio não encontrado.');
    await this.prisma.romaneioItem.deleteMany({ where: { romaneioId } });
    await this.prisma.romaneio.delete({ where: { id: romaneioId } });
    return { ok: true };
  }
}
