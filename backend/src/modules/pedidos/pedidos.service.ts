import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface ItemDto {
  produtoId: string;
  descricao?: string;
  quantidade: number;
  unidade?: string;
  precoUnitario: number;
  descontoTipo?: 'VALOR' | 'PERCENT';
  descontoPercent?: number;
  desconto?: number; // R$
}

interface PedidoDto {
  filialOrigemId: string;
  clienteId: string;
  usuarioId: string;
  tipo?: string;
  dataEmissao?: string;
  dataEntrega?: string;
  periodo?: string;
  regiao?: string;
  volumes?: number;
  formaPagamento?: string;
  condicaoPagamento?: string;
  numeroParcelas?: number;
  tipoFrete?: string;
  valorFrete?: number;
  descontoTotal?: number;
  observacoes?: string;
  observacoesNf?: string;
  enderecoEntregaJson?: any;
  itens?: ItemDto[];
}

@Injectable()
export class PedidosService {
  constructor(private prisma: PrismaService) {}

  // ── Resolve desconto do item em R$ ──
  private descontoEmReais(item: ItemDto): number {
    const bruto = item.quantidade * item.precoUnitario;
    if (item.descontoTipo === 'PERCENT') {
      return bruto * ((item.descontoPercent || 0) / 100);
    }
    return item.desconto || 0;
  }

  // ── Calcula linhas + totais do pedido ──
  private async montarItensETotais(tenantId: string, dto: PedidoDto) {
    const itensInput = dto.itens || [];
    if (itensInput.length === 0) {
      return { itensData: [] as any[], subtotal: 0, pesoTotal: 0, valorTotal: 0 };
    }

    const produtoIds = itensInput.map((i) => i.produtoId);
    const produtos = await this.prisma.produto.findMany({
      where: { tenantId, id: { in: produtoIds } },
      include: { unidadeMedida: { select: { sigla: true } } },
    });
    const mapProd = new Map(produtos.map((p) => [p.id, p]));

    let subtotal = 0;
    let pesoTotal = 0;
    const itensData = itensInput.map((item) => {
      const prod = mapProd.get(item.produtoId);
      if (!prod) throw new BadRequestException(`Produto ${item.produtoId} não encontrado.`);
      const bruto = item.quantidade * item.precoUnitario;
      const descontoR$ = this.descontoEmReais(item);
      const valorLinha = Math.max(0, bruto - descontoR$);
      subtotal += valorLinha;
      pesoTotal += Number(prod.pesoBruto || 0) * item.quantidade;
      return {
        produtoId: item.produtoId,
        descricao: item.descricao || prod.descricao,
        quantidade: item.quantidade,
        unidade: item.unidade || prod.unidadeMedida?.sigla || 'UN',
        precoUnitario: item.precoUnitario,
        desconto: descontoR$,
        descontoTipo: item.descontoTipo || 'VALOR',
        descontoPercent: item.descontoPercent || 0,
        valorTotal: valorLinha,
        cfop: prod.cfop,
      };
    });

    const descontoGeral = dto.descontoTotal || 0;
    const frete = dto.valorFrete || 0;
    const valorTotal = Math.max(0, subtotal - descontoGeral + frete);
    return { itensData, subtotal, pesoTotal, valorTotal };
  }

  // ── Análise de crédito do cliente ──
  // Retorna { bloqueado, motivo } com base em limite de crédito e duplicatas vencidas.
  private async analisarCredito(tenantId: string, clienteId: string, valorPedido: number) {
    const cliente = await this.prisma.cliente.findFirst({ where: { id: clienteId, tenantId } });
    if (!cliente) return { bloqueado: false, motivo: null as string | null };

    const hoje = new Date();
    const abertas = await this.prisma.contaReceber.findMany({
      where: { tenantId, clienteId, status: 'ABERTO' },
      select: { valorOriginal: true, valorPago: true, dataVencimento: true },
    });

    const totalAberto = abertas.reduce((s, c) => s + (Number(c.valorOriginal) - Number(c.valorPago)), 0);
    const vencidas = abertas.filter((c) => c.dataVencimento < hoje);
    const limite = Number(cliente.limiteCredito || 0);

    if (vencidas.length > 0) {
      return { bloqueado: true, motivo: `Cliente possui ${vencidas.length} duplicata(s) vencida(s).` };
    }
    if (limite > 0 && totalAberto + valorPedido > limite) {
      return {
        bloqueado: true,
        motivo: `Limite de crédito excedido (limite R$ ${limite.toFixed(2)}, em aberto + pedido R$ ${(totalAberto + valorPedido).toFixed(2)}).`,
      };
    }
    return { bloqueado: false, motivo: null };
  }

  async create(tenantId: string, dto: PedidoDto) {
    const ultimo = await this.prisma.pedido.findFirst({
      where: { tenantId, filialOrigemId: dto.filialOrigemId },
      orderBy: { numero: 'desc' },
      select: { numero: true },
    });
    const numero = (ultimo?.numero || 0) + 1;

    const { itensData, subtotal, pesoTotal, valorTotal } = await this.montarItensETotais(tenantId, dto);
    const credito = dto.clienteId
      ? await this.analisarCredito(tenantId, dto.clienteId, valorTotal)
      : { bloqueado: false, motivo: null };

    return this.prisma.pedido.create({
      data: {
        tenantId,
        filialOrigemId: dto.filialOrigemId,
        clienteId: dto.clienteId,
        usuarioId: dto.usuarioId,
        numero,
        tipo: dto.tipo || 'VENDA',
        status: 'RASCUNHO',
        observacoes: dto.observacoes,
        observacoesNf: dto.observacoesNf,
        tipoFrete: dto.tipoFrete,
        formaPagamento: dto.formaPagamento,
        condicaoPagamento: dto.condicaoPagamento,
        numeroParcelas: dto.numeroParcelas || 1,
        periodo: dto.periodo,
        regiao: dto.regiao,
        volumes: dto.volumes || 0,
        pesoTotal,
        enderecoEntregaJson: dto.enderecoEntregaJson,
        dataEmissao: dto.dataEmissao ? new Date(dto.dataEmissao) : undefined,
        dataEntrega: dto.dataEntrega ? new Date(dto.dataEntrega) : undefined,
        subtotal,
        descontoTotal: dto.descontoTotal || 0,
        valorFrete: dto.valorFrete || 0,
        valorTotal,
        bloqueioCredito: credito.bloqueado,
        motivoBloqueio: credito.motivo,
        itens: itensData.length > 0 ? { create: itensData } : undefined,
      },
      include: {
        cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true, cnpjCpf: true } },
        itens: true,
        filialOrigem: { select: { id: true, codigo: true, nome: true } },
      },
    });
  }

  async update(tenantId: string, id: string, dto: PedidoDto) {
    const pedido = await this.findOne(tenantId, id);
    if (pedido.status !== 'RASCUNHO') {
      throw new BadRequestException('Só é possível editar pedidos em rascunho.');
    }

    const { itensData, subtotal, pesoTotal, valorTotal } = await this.montarItensETotais(tenantId, dto);
    const credito = dto.clienteId
      ? await this.analisarCredito(tenantId, dto.clienteId, valorTotal)
      : { bloqueado: false, motivo: null };

    // Recria os itens (estratégia simples para rascunho)
    await this.prisma.itemPedido.deleteMany({ where: { pedidoId: id } });

    return this.prisma.pedido.update({
      where: { id },
      data: {
        clienteId: dto.clienteId,
        observacoes: dto.observacoes,
        observacoesNf: dto.observacoesNf,
        tipoFrete: dto.tipoFrete,
        formaPagamento: dto.formaPagamento,
        condicaoPagamento: dto.condicaoPagamento,
        numeroParcelas: dto.numeroParcelas || 1,
        periodo: dto.periodo,
        regiao: dto.regiao,
        volumes: dto.volumes || 0,
        pesoTotal,
        enderecoEntregaJson: dto.enderecoEntregaJson,
        dataEmissao: dto.dataEmissao ? new Date(dto.dataEmissao) : undefined,
        dataEntrega: dto.dataEntrega ? new Date(dto.dataEntrega) : undefined,
        subtotal,
        descontoTotal: dto.descontoTotal || 0,
        valorFrete: dto.valorFrete || 0,
        valorTotal,
        bloqueioCredito: credito.bloqueado,
        motivoBloqueio: credito.motivo,
        itens: itensData.length > 0 ? { create: itensData } : undefined,
      },
      include: {
        cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true, cnpjCpf: true } },
        itens: true,
      },
    });
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
        itens: { include: { produto: { select: { codigo: true, descricao: true, codigoBarras: true } } } },
        filialOrigem: true,
      },
    });
    if (!pedido) throw new NotFoundException('Pedido não encontrado.');
    return pedido;
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    await this.findOne(tenantId, id);
    return this.prisma.pedido.update({
      where: { id },
      data: { status: status as any },
    });
  }

  // Aprovar = CONFIRMADO. Bloqueia só por crédito. Estoque pode ficar NEGATIVO
  // (gera aviso de "precisa comprar") em vez de impedir a aprovação.
  async confirmar(tenantId: string, id: string) {
    const pedido = await this.findOne(tenantId, id);

    if (pedido.bloqueioCredito) {
      throw new BadRequestException(
        `Pedido bloqueado por crédito: ${pedido.motivoBloqueio || 'análise pendente'}.`,
      );
    }

    const avisosEstoque: { produtoId: string; descricao: string; disponivelAntes: number; pedido: number; faltam: number }[] = [];

    // Reserva cada item — permitindo o disponível ficar NEGATIVO
    for (const item of pedido.itens) {
      let saldo = await this.prisma.estoqueSaldo.findFirst({
        where: { tenantId, filialId: pedido.filialOrigemId, produtoId: item.produtoId, loteId: null },
      });
      if (!saldo) {
        saldo = await this.prisma.estoqueSaldo.create({
          data: {
            tenantId, filialId: pedido.filialOrigemId, produtoId: item.produtoId,
            quantidade: 0, quantidadeReservada: 0, quantidadeDisponivel: 0,
          },
        });
      }
      const disponivelAntes = Number(saldo.quantidade) - Number(saldo.quantidadeReservada);
      const qtd = Number(item.quantidade);
      const novaReservada = Number(saldo.quantidadeReservada) + qtd;
      const novoDisponivel = Number(saldo.quantidade) - novaReservada; // pode ser < 0

      await this.prisma.estoqueSaldo.update({
        where: { id: saldo.id },
        data: { quantidadeReservada: novaReservada, quantidadeDisponivel: novoDisponivel },
      });

      if (novoDisponivel < 0) {
        avisosEstoque.push({
          produtoId: item.produtoId,
          descricao: item.descricao,
          disponivelAntes,
          pedido: qtd,
          faltam: Math.abs(novoDisponivel),
        });
      }
    }

    const atualizado = await this.prisma.pedido.update({
      where: { id },
      data: { status: 'CONFIRMADO' as any },
    });
    return { ...atualizado, avisosEstoque };
  }

  async cancelar(tenantId: string, id: string) {
    return this.updateStatus(tenantId, id, 'CANCELADO');
  }
}
