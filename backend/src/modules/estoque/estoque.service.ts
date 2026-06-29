import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { TipoMovimentacao } from '@prisma/client';

export interface MovimentarEstoqueDto {
  filialId: string;
  produtoId: string;
  loteId?: string;
  localizacaoId?: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  custoUnitario?: number;
  pedidoId?: string;
  entradaId?: string;
  nfeId?: string;
  filialDestinoId?: string;
  observacoes?: string;
  usuarioId: string;
}

@Injectable()
export class EstoqueService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  /**
   * Consulta saldo disponível — usado para validar pedidos e picking
   */
  async getSaldo(tenantId: string, filialId: string, produtoId: string, loteId?: string) {
    return this.prisma.estoqueSaldo.findMany({
      where: { tenantId, filialId, produtoId, ...(loteId && { loteId }) },
      include: {
        produto: { select: { descricao: true, unidadeMedida: { select: { sigla: true } } } },
        lote: { select: { numero: true, dataValidade: true } },
        localizacao: { select: { rua: true, prateleira: true } },
      },
      orderBy: [{ lote: { dataValidade: 'asc' } }], // FEFO — First Expired, First Out
    });
  }

  /**
   * Posição de estoque geral da filial
   */
  async getPosicaoGeral(tenantId: string, filialId: string, filters?: { categoria?: string; alertaValidade?: boolean }) {
    const where: any = { tenantId, filialId };

    const saldos = await this.prisma.estoqueSaldo.findMany({
      where,
      include: {
        produto: {
          select: {
            codigo: true, descricao: true, categoria: true,
            estoqueMinimo: true, diasAlertaValidade: true,
            unidadeMedida: { select: { sigla: true } },
          },
        },
        lote: { select: { numero: true, dataValidade: true } },
        localizacao: { select: { rua: true, bloco: true, prateleira: true } },
      },
    });

    // Alerta de validade para FLV/perecíveis
    const hoje = new Date();
    const resultado = saldos.map((s) => {
      const diasAteVencer = s.lote?.dataValidade
        ? Math.floor((s.lote.dataValidade.getTime() - hoje.getTime()) / 86400000)
        : null;

      return {
        ...s,
        diasAteVencer,
        alertaValidade: diasAteVencer !== null && diasAteVencer <= (s.produto.diasAlertaValidade || 3),
        abaixoMinimo: Number(s.quantidade) <= Number(s.produto.estoqueMinimo),
      };
    });

    if (filters?.alertaValidade) return resultado.filter((r) => r.alertaValidade);
    return resultado;
  }

  /**
   * NÚCLEO DO WMS: Movimenta estoque com controle de saldo, FEFO e auditoria.
   * Toda entrada/saída/transferência passa por aqui.
   */
  async movimentar(tenantId: string, dto: MovimentarEstoqueDto): Promise<void> {
    const tiposEntrada: TipoMovimentacao[] = [
      TipoMovimentacao.ENTRADA_COMPRA,
      TipoMovimentacao.ENTRADA_DEVOLUCAO,
      TipoMovimentacao.TRANSFERENCIA_ENTRADA,
      TipoMovimentacao.AJUSTE_POSITIVO,
    ];
    const isEntrada = tiposEntrada.includes(dto.tipo);

    const isSaida = !isEntrada;

    await this.prisma.$transaction(async (tx) => {
      // 1. Busca ou cria saldo
      const saldoKey = {
        tenantId,
        filialId: dto.filialId,
        produtoId: dto.produtoId,
        loteId: dto.loteId ?? null,
        localizacaoId: dto.localizacaoId ?? null,
      };

      let saldo = await tx.estoqueSaldo.findFirst({ where: saldoKey });

      if (!saldo) {
        if (isSaida) throw new BadRequestException(`Sem saldo para o produto ${dto.produtoId} na filial ${dto.filialId}.`);
        saldo = await tx.estoqueSaldo.create({
          data: { ...saldoKey, quantidade: 0, quantidadeReservada: 0, quantidadeDisponivel: 0, custoMedio: dto.custoUnitario || 0 },
        });
      }

      const qtdAtual = Number(saldo.quantidade);
      if (isSaida && qtdAtual < dto.quantidade) {
        throw new BadRequestException(
          `Saldo insuficiente. Disponível: ${qtdAtual}, Solicitado: ${dto.quantidade}`,
        );
      }

      // 2. Calcula novo saldo e custo médio (CMV)
      const novaQtd = isEntrada ? qtdAtual + dto.quantidade : qtdAtual - dto.quantidade;
      let novoCustoMedio = Number(saldo.custoMedio);

      if (isEntrada && dto.custoUnitario && dto.custoUnitario > 0) {
        // Custo médio ponderado
        const totalAtual = qtdAtual * novoCustoMedio;
        const totalNovo = dto.quantidade * dto.custoUnitario;
        novoCustoMedio = (totalAtual + totalNovo) / (qtdAtual + dto.quantidade);
      }

      // 3. Atualiza saldo
      await tx.estoqueSaldo.update({
        where: { id: saldo.id },
        data: {
          quantidade: novaQtd,
          quantidadeDisponivel: Math.max(0, novaQtd - Number(saldo.quantidadeReservada)),
          custoMedio: novoCustoMedio,
        },
      });

      // 4. Registra movimentação (log permanente)
      await tx.movimentacaoEstoque.create({
        data: {
          tenantId,
          filialId: dto.filialId,
          usuarioId: dto.usuarioId,
          produtoId: dto.produtoId,
          loteId: dto.loteId,
          localizacaoId: dto.localizacaoId,
          tipo: dto.tipo,
          quantidade: dto.quantidade,
          custoUnitario: dto.custoUnitario || novoCustoMedio,
          saldoAnterior: qtdAtual,
          saldoFinal: novaQtd,
          pedidoId: dto.pedidoId,
          entradaId: dto.entradaId,
          nfeId: dto.nfeId,
          filialDestinoId: dto.filialDestinoId,
          observacoes: dto.observacoes,
        },
      });
    });

    // 5. Emite evento para listeners (Event-Driven)
    this.events.emit(`estoque.${dto.tipo.toLowerCase()}`, {
      tenantId, ...dto, timestamp: new Date(),
    });
  }

  /**
   * Transferência entre filiais — gera saída na origem e entrada no destino
   */
  async transferir(tenantId: string, dto: {
    filialOrigemId: string; filialDestinoId: string;
    produtoId: string; loteId?: string; localizacaoOrigemId?: string;
    quantidade: number; usuarioId: string; observacoes?: string;
  }) {
    // Saída da origem
    await this.movimentar(tenantId, {
      filialId: dto.filialOrigemId,
      filialDestinoId: dto.filialDestinoId,
      produtoId: dto.produtoId,
      loteId: dto.loteId,
      localizacaoId: dto.localizacaoOrigemId,
      tipo: TipoMovimentacao.TRANSFERENCIA_SAIDA,
      quantidade: dto.quantidade,
      usuarioId: dto.usuarioId,
      observacoes: dto.observacoes,
    });

    // Entrada no destino
    await this.movimentar(tenantId, {
      filialId: dto.filialDestinoId,
      produtoId: dto.produtoId,
      loteId: dto.loteId,
      tipo: TipoMovimentacao.TRANSFERENCIA_ENTRADA,
      quantidade: dto.quantidade,
      usuarioId: dto.usuarioId,
      observacoes: dto.observacoes,
    });

    this.events.emit('estoque.transferencia', { tenantId, ...dto, timestamp: new Date() });
  }

  /**
   * Reserva estoque para um pedido (sem baixar — só marca como reservado)
   */
  async reservar(tenantId: string, pedidoId: string, itens: { produtoId: string; loteId?: string; filialId: string; quantidade: number }[]) {
    for (const item of itens) {
      const saldo = await this.prisma.estoqueSaldo.findFirst({
        where: { tenantId, filialId: item.filialId, produtoId: item.produtoId, loteId: item.loteId ?? null },
      });
      if (!saldo || Number(saldo.quantidadeDisponivel) < item.quantidade) {
        throw new BadRequestException(`Saldo insuficiente para produto ${item.produtoId}`);
      }
      await this.prisma.estoqueSaldo.update({
        where: { id: saldo.id },
        data: {
          quantidadeReservada: Number(saldo.quantidadeReservada) + item.quantidade,
          quantidadeDisponivel: Number(saldo.quantidadeDisponivel) - item.quantidade,
        },
      });
    }
  }

  /**
   * Produtos a comprar/repor: disponível negativo (vendido sem estoque) ou abaixo do mínimo.
   * Agrega por produto somando todos os saldos (lotes/localizações) da filial.
   */
  async getAComprar(tenantId: string, filialId: string) {
    const saldos = await this.prisma.estoqueSaldo.findMany({
      where: { tenantId, filialId },
      include: {
        produto: {
          select: {
            id: true, codigo: true, descricao: true, estoqueMinimo: true,
            unidadeMedida: { select: { sigla: true } },
          },
        },
      },
    });

    const porProduto = new Map<string, { produtoId: string; codigo: string; descricao: string; unidade: string; quantidade: number; reservada: number; disponivel: number; estoqueMinimo: number }>();
    for (const s of saldos) {
      const k = s.produtoId;
      const cur = porProduto.get(k) || {
        produtoId: k,
        codigo: s.produto.codigo,
        descricao: s.produto.descricao,
        unidade: s.produto.unidadeMedida?.sigla || 'UN',
        quantidade: 0, reservada: 0, disponivel: 0,
        estoqueMinimo: Number(s.produto.estoqueMinimo || 0),
      };
      cur.quantidade += Number(s.quantidade);
      cur.reservada += Number(s.quantidadeReservada);
      cur.disponivel = cur.quantidade - cur.reservada;
      porProduto.set(k, cur);
    }

    return [...porProduto.values()]
      .filter((p) => p.disponivel < 0 || p.disponivel <= p.estoqueMinimo)
      .map((p) => ({
        ...p,
        negativo: p.disponivel < 0,
        sugestaoCompra: Math.max(0, p.estoqueMinimo - p.disponivel),
      }))
      .sort((a, b) => a.disponivel - b.disponivel);
  }

  async getMovimentacoes(tenantId: string, filialId: string, filters: { produtoId?: string; tipo?: TipoMovimentacao; dataInicio?: Date; dataFim?: Date }) {
    return this.prisma.movimentacaoEstoque.findMany({
      where: {
        tenantId, filialId,
        ...(filters.produtoId && { produtoId: filters.produtoId }),
        ...(filters.tipo && { tipo: filters.tipo }),
        ...(filters.dataInicio && { dataMovimento: { gte: filters.dataInicio, ...(filters.dataFim && { lte: filters.dataFim }) } }),
      },
      include: {
        produto: { select: { codigo: true, descricao: true } },
        lote: { select: { numero: true, dataValidade: true } },
        usuario: { select: { nome: true } },
        localizacao: { select: { rua: true, prateleira: true } },
      },
      orderBy: { dataMovimento: 'desc' },
      take: 500,
    });
  }

  /**
   * Relatório de perecíveis vencendo nos próximos N dias (crítico para FLV)
   */
  async getAlertasValidade(tenantId: string, filialId: string, dias = 5) {
    const limite = new Date();
    limite.setDate(limite.getDate() + dias);

    return this.prisma.estoqueSaldo.findMany({
      where: {
        tenantId, filialId,
        quantidade: { gt: 0 },
        lote: { dataValidade: { lte: limite } },
      },
      include: {
        produto: { select: { codigo: true, descricao: true } },
        lote: { select: { numero: true, dataValidade: true } },
        localizacao: { select: { rua: true, prateleira: true } },
      },
      orderBy: { lote: { dataValidade: 'asc' } },
    });
  }
}
