import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StatusRomaneio } from '@prisma/client';

@Injectable()
export class RomaneiosService {
  constructor(private prisma: PrismaService) {}

  /** Lista os romaneios (viagens), com filtros opcionais de filial/status/período. */
  async findAll(tenantId: string, filters: { filialId?: string; status?: string; dataIni?: string; dataFim?: string } = {}) {
    const romaneios = await this.prisma.romaneio.findMany({
      where: {
        tenantId,
        ...(filters.filialId && { filialId: filters.filialId }),
        ...(filters.status && { status: filters.status as StatusRomaneio }),
        ...(filters.dataIni && {
          dataEntrega: { gte: new Date(filters.dataIni), ...(filters.dataFim && { lte: new Date(filters.dataFim + 'T23:59:59') }) },
        }),
      },
      include: {
        veiculo: { select: { placa: true, modelo: true, capacidadeKg: true } },
        itens: { select: { id: true, entregue: true, pedido: { select: { pesoTotal: true, valorTotal: true } } } },
      },
      orderBy: [{ dataEntrega: 'desc' }, { numero: 'desc' }],
    });

    return romaneios.map((r) => ({
      id: r.id,
      numero: r.numero,
      status: r.status,
      motorista: r.motorista || '—',
      placa: r.veiculo?.placa || r.placaVeiculo || '—',
      tipoVeiculo: r.tipoVeiculo || 'VAN',
      refrigerado: r.refrigerado,
      periodo: r.periodo || 'MANHA',
      dataEntrega: r.dataEntrega,
      dataSaida: r.dataSaida,
      dataRetorno: r.dataRetorno,
      capacidadeKg: r.veiculo?.capacidadeKg ? Number(r.veiculo.capacidadeKg) : null,
      qtdEntregas: r.itens.length,
      entregues: r.itens.filter((i) => i.entregue).length,
      pesoKg: r.itens.reduce((s, i) => s + Number(i.pedido?.pesoTotal || 0), 0),
      valorTotal: r.itens.reduce((s, i) => s + Number(i.pedido?.valorTotal || 0), 0),
      valorFrete: Number(r.valorFrete || 0),
    }));
  }

  /** Detalhe de um romaneio: pedidos consolidados ordenados por sequência de entrega. */
  async findOne(tenantId: string, id: string) {
    const r = await this.prisma.romaneio.findFirst({
      where: { id, tenantId },
      include: {
        veiculo: { select: { placa: true, modelo: true, capacidadeKg: true, capacidadeCaixasH: true } },
        filial: { select: { nome: true } },
        itens: {
          orderBy: { ordemEntrega: 'asc' },
          include: {
            pedido: {
              select: {
                id: true, numero: true, pesoTotal: true, volumes: true, valorTotal: true, observacoes: true,
                cliente: { select: { razaoSocial: true, nomeFantasia: true, enderecoJson: true, telefone: true } },
              },
            },
          },
        },
      },
    });
    if (!r) throw new NotFoundException('Romaneio não encontrado.');
    return r;
  }

  /** Muda o status da viagem (montagem → trânsito → concluído) marcando datas. */
  async mudarStatus(tenantId: string, id: string, status: string) {
    const r = await this.prisma.romaneio.findFirst({ where: { id, tenantId } });
    if (!r) throw new NotFoundException('Romaneio não encontrado.');
    const data: any = { status: status as StatusRomaneio };
    if (status === 'EM_ROTA' && !r.dataSaida) data.dataSaida = new Date();
    if ((status === 'ENTREGUE' || status === 'ENTREGUE_PARCIAL') && !r.dataRetorno) data.dataRetorno = new Date();
    return this.prisma.romaneio.update({ where: { id }, data });
  }

  /** Marca/desmarca uma entrega (item) como entregue; se todas entregues, conclui o romaneio. */
  async marcarEntrega(tenantId: string, itemId: string, entregue: boolean) {
    const item = await this.prisma.romaneioItem.findFirst({
      where: { id: itemId, romaneio: { tenantId } },
      include: { romaneio: { include: { itens: true } } },
    });
    if (!item) throw new NotFoundException('Item do romaneio não encontrado.');
    await this.prisma.romaneioItem.update({ where: { id: itemId }, data: { entregue } });
    const itens = item.romaneio.itens.map((i) => (i.id === itemId ? { ...i, entregue } : i));
    const todas = itens.every((i) => i.entregue);
    const alguma = itens.some((i) => i.entregue);
    const novoStatus = todas ? 'ENTREGUE' : alguma ? 'ENTREGUE_PARCIAL' : item.romaneio.status;
    if (novoStatus !== item.romaneio.status) {
      await this.prisma.romaneio.update({
        where: { id: item.romaneioId },
        data: { status: novoStatus as StatusRomaneio, ...(todas && !item.romaneio.dataRetorno && { dataRetorno: new Date() }) },
      });
    }
    return { ok: true, status: novoStatus };
  }
}
