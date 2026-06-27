import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PedidosService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: {
    filialOrigemId: string;
    clienteId: string;
    usuarioId: string;
    tipo?: string;
    observacoes?: string;
    tipoFrete?: string;
    dataEntrega?: string;
    itens?: Array<{
      produtoId: string;
      descricao: string;
      quantidade: number;
      unidade: string;
      precoUnitario: number;
    }>;
  }) {
    // Próximo número do pedido na filial
    const ultimo = await this.prisma.pedido.findFirst({
      where: { tenantId, filialOrigemId: dto.filialOrigemId },
      orderBy: { numero: 'desc' },
      select: { numero: true },
    });
    const numero = (ultimo?.numero || 0) + 1;

    // Calcula totais dos itens
    const itensData = (dto.itens || []).map(item => ({
      produtoId: item.produtoId,
      descricao: item.descricao,
      quantidade: item.quantidade,
      unidade: item.unidade,
      precoUnitario: item.precoUnitario,
      valorTotal: item.quantidade * item.precoUnitario,
    }));
    const subtotal = itensData.reduce((s, i) => s + i.valorTotal, 0);

    const pedido = await this.prisma.pedido.create({
      data: {
        tenantId,
        filialOrigemId: dto.filialOrigemId,
        clienteId: dto.clienteId,
        usuarioId: dto.usuarioId,
        numero,
        tipo: dto.tipo || 'VENDA',
        status: 'RASCUNHO',
        observacoes: dto.observacoes,
        tipoFrete: dto.tipoFrete,
        dataEntrega: dto.dataEntrega ? new Date(dto.dataEntrega) : undefined,
        subtotal,
        valorTotal: subtotal,
        itens: itensData.length > 0 ? { create: itensData } : undefined,
      },
      include: {
        cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true, cnpjCpf: true } },
        itens: true,
        filialOrigem: { select: { id: true, codigo: true, nome: true } },
      },
    });

    return pedido;
  }

  async findAll(tenantId: string, filters?: {
    filialId?: string;
    status?: string;
    clienteId?: string;
    dataInicio?: string;
    dataFim?: string;
    search?: string;
  }) {
    const where: any = { tenantId };
    if (filters?.filialId) where.filialOrigemId = filters.filialId;
    if (filters?.status) where.status = filters.status;
    if (filters?.clienteId) where.clienteId = filters.clienteId;
    if (filters?.search) {
      where.OR = [
        { cliente: { razaoSocial: { contains: filters.search, mode: 'insensitive' } } },
        { cliente: { nomeFantasia: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }
    if (filters?.dataInicio) {
      where.dataEntrega = {
        gte: new Date(filters.dataInicio),
        ...(filters.dataFim && { lte: new Date(filters.dataFim + 'T23:59:59') }),
      };
    }

    return this.prisma.pedido.findMany({
      where,
      include: {
        cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
        filialOrigem: { select: { id: true, codigo: true, nome: true } },
        _count: { select: { itens: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async findOne(tenantId: string, id: string) {
    const pedido = await this.prisma.pedido.findFirst({
      where: { id, tenantId },
      include: {
        cliente: true,
        itens: { include: { produto: { select: { codigo: true, descricao: true } } } },
        filialOrigem: true,
      },
    });
    if (!pedido) throw new NotFoundException('Pedido não encontrado.');
    return pedido;
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    const pedido = await this.findOne(tenantId, id);
    return this.prisma.pedido.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async confirmar(tenantId: string, id: string) {
    return this.updateStatus(tenantId, id, 'CONFIRMADO');
  }

  async cancelar(tenantId: string, id: string) {
    return this.updateStatus(tenantId, id, 'CANCELADO');
  }
}
