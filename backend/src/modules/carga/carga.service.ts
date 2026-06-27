import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CargaService {
  constructor(private prisma: PrismaService) {}

  /** Grade de pedidos do dia para Controle de Carga */
  async getGrade(tenantId: string, filialId: string, data: string, filtros: {
    segmento?: string;
    somentePendentes?: boolean;
    somenteEscolas?: boolean;
    mostrarFinalizados?: boolean;
  }) {
    const dataObj = new Date(data);
    const inicio  = new Date(dataObj); inicio.setHours(0, 0, 0, 0);
    const fim     = new Date(dataObj); fim.setHours(23, 59, 59, 999);

    const pedidos = await this.prisma.pedido.findMany({
      where: {
        tenantId,
        filialOrigemId: filialId,
        dataEntrega: { gte: inicio, lte: fim },
        ...(filtros.mostrarFinalizados ? {} : { status: { not: 'CANCELADO' } }),
      },
      include: {
        cliente: { select: { razaoSocial: true, nomeFantasia: true, cnpjCpf: true, enderecoJson: true } },
        itens: { select: { quantidade: true, valorTotal: true } },
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    return pedidos.map((p) => {
      const end: any = p.cliente?.enderecoJson || {};
      return {
        id: p.id,
        numero: p.numero,
        data: p.dataEntrega,
        liberadoEm: (p as any).liberadoEm,
        nomeFantasia: p.cliente?.nomeFantasia || p.cliente?.razaoSocial || '—',
        referencia: String(p.numero).padStart(5, '0'),
        volumes: (p as any).volumes || 0,
        pesoKg: Number((p as any).pesoKg || 0).toFixed(3),
        empresa: 'Hetr.',
        tipoFaturamento: p.tipo === 'VENDA' ? 'NFe' : p.tipo,
        status: p.status,
        statusCarga: (p as any).statusCarga || 'IMPRESSAO_PENDENTE',
        aurCargaOk: (p as any).aurCargaOk || false,
        regiao: (p as any).regiao || '',
        cep: end.cep || '',
        bairro: end.bairro || '',
        subRegiao: (p as any).subRegiao || '',
        onda: (p as any).onda || 1,
        periodo: (p as any).periodo || 'MANHA',
        rota: null,
        recebimento: null,
        motorista: null,
        andamento: 0,
        valorTotal: Number(p.valorTotal),
      };
    });
  }

  /** Rotas do dia com motoristas e pesos */
  async getRotas(tenantId: string, filialId: string, data: string) {
    const dataObj = new Date(data);
    const inicio  = new Date(dataObj); inicio.setHours(0, 0, 0, 0);
    const fim     = new Date(dataObj); fim.setHours(23, 59, 59, 999);

    const romaneios: any[] = await this.prisma.romaneio.findMany({
      where: { tenantId, filialId, createdAt: { gte: inicio, lte: fim } },
      include: {
        transportadora: { select: { razaoSocial: true } },
        itens: { include: { pedido: true } },
      },
      orderBy: { numero: 'asc' },
    });

    return romaneios.map((r: any) => {
      const pesoTotal = (r.itens || []).reduce((s: number, i: any) => s + Number(i.pedido?.pesoKg || 0), 0);
      return {
        id: r.id,
        numero: r.numero,
        motorista: r.motorista || '—',
        tipoVeiculo: 'VAN',
        refrigerado: false,
        pesoKg: pesoTotal,
        qtdEntregas: (r.itens || []).length,
        periodo: r.periodo || 'MANHA',
        horaInicio: r.horaInicio,
        status: r.status,
        slaPercent: Number(r.slaPercent || 0),
      };
    });
  }

  /** Totalizadores para o painel inferior */
  async getTotais(tenantId: string, filialId: string, data: string) {
    const rotas = await this.getRotas(tenantId, filialId, data);
    return {
      qtdRotas: rotas.length,
      pesoCargaKg: rotas.reduce((s, r) => s + r.pesoKg, 0),
      qtdEntregas: rotas.reduce((s, r) => s + r.qtdEntregas, 0),
      slaPercent: rotas.length
        ? rotas.reduce((s, r) => s + r.slaPercent, 0) / rotas.length
        : 0,
    };
  }

  /** Autoriza carga de pedidos selecionados */
  async autorizarCarga(tenantId: string, pedidoIds: string[]) {
    await this.prisma.pedido.updateMany({
      where: { id: { in: pedidoIds }, tenantId },
      data: { aurCargaOk: true, statusCarga: 'AURCARGA_OK' } as any,
    });
    return { autorizados: pedidoIds.length };
  }

  /** Rotear: associa pedidos a um romaneio/motorista */
  async rotear(tenantId: string, pedidoIds: string[], romaneioId: string) {
    for (const id of pedidoIds) {
      const existe = await this.prisma.romaneioItem.findFirst({
        where: { romaneioId, pedidoId: id },
      });
      if (!existe) {
        const ultimo = await this.prisma.romaneioItem.count({ where: { romaneioId } });
        await this.prisma.romaneioItem.create({
          data: { romaneioId, pedidoId: id, ordemEntrega: ultimo + 1 },
        });
      }
    }
    return { roteados: pedidoIds.length };
  }
}
