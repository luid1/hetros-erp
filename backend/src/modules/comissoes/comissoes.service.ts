import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { StatusComissao } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { money, sumMoney } from '../../common/utils/money.util';
import { ContasPagarService, UsuarioCtx } from '../contas-pagar/contas-pagar.service';
import { CONTA } from '../plano-contas/plano-contas.seed';
import { FecharComissaoDto } from './dto/comissao.dto';

/**
 * Comissões de vendedores (Frente B). O fato gerador é a EMISSÃO da NF-e:
 * ao emitir, se o pedido tiver vendedor, cria-se uma Comissao PENDENTE
 * (idempotente por nfe+vendedor). No cancelamento da NF-e, a comissão é
 * marcada como CANCELADA (a menos que já tenha sido fechada em título).
 * O fechamento agrupa as PENDENTES em Conta a Pagar (categoria COMISSOES).
 */
@Injectable()
export class ComissoesService {
  private readonly logger = new Logger(ComissoesService.name);

  constructor(
    private prisma: PrismaService,
    private contasPagar: ContasPagarService,
  ) {}

  async findAll(
    tenantId: string,
    filtros?: { status?: string; vendedorId?: string; dataInicio?: string; dataFim?: string },
  ) {
    const where: any = { tenantId };
    if (filtros?.status) where.status = filtros.status as StatusComissao;
    if (filtros?.vendedorId) where.vendedorId = filtros.vendedorId;
    if (filtros?.dataInicio || filtros?.dataFim) {
      where.competencia = {};
      if (filtros.dataInicio) where.competencia.gte = new Date(filtros.dataInicio);
      if (filtros.dataFim) where.competencia.lte = new Date(filtros.dataFim);
    }
    return this.prisma.comissao.findMany({
      where,
      include: { vendedor: { select: { id: true, nome: true } } },
      orderBy: { competencia: 'desc' },
    });
  }

  async resumo(tenantId: string) {
    const grupos = await this.prisma.comissao.groupBy({
      by: ['status'],
      where: { tenantId },
      _sum: { valor: true },
      _count: { _all: true },
    });
    const base = { PENDENTE: 0, FECHADA: 0, CANCELADA: 0 };
    for (const g of grupos) base[g.status] = money(g._sum.valor || 0);
    return {
      pendente: base.PENDENTE,
      fechada: base.FECHADA,
      cancelada: base.CANCELADA,
    };
  }

  /** nfe.emitida → cria a comissão do pedido (se houver vendedor). Idempotente. */
  @OnEvent('nfe.emitida')
  async handleNFeEmitida(payload: { tenantId: string; nfeId: string; filialId: string; pedidoId?: string }) {
    try {
      if (!payload.pedidoId) return;
      const pedido = await this.prisma.pedido.findUnique({
        where: { id: payload.pedidoId },
        select: {
          id: true, tenantId: true, vendedorId: true, percentualComissao: true,
          subtotal: true, descontoTotal: true, numero: true,
        },
      });
      if (!pedido || !pedido.vendedorId) return;

      const vendedor = await this.prisma.vendedor.findFirst({
        where: { id: pedido.vendedorId, tenantId: payload.tenantId },
      });
      if (!vendedor) return;

      const percentual = pedido.percentualComissao != null
        ? money(pedido.percentualComissao)
        : money(vendedor.percentualPadrao);
      if (percentual <= 0) return;

      const base = money(Number(pedido.subtotal) - Number(pedido.descontoTotal));
      if (base <= 0) return;
      const valor = money((base * percentual) / 100);
      if (valor <= 0) return;

      // Idempotência: @@unique([tenantId, nfeId, vendedorId]).
      const jaExiste = await this.prisma.comissao.findFirst({
        where: { tenantId: payload.tenantId, nfeId: payload.nfeId, vendedorId: vendedor.id },
      });
      if (jaExiste) return;

      await this.prisma.comissao.create({
        data: {
          tenantId: payload.tenantId,
          filialId: payload.filialId || null,
          vendedorId: vendedor.id,
          pedidoId: pedido.id,
          nfeId: payload.nfeId,
          descricao: `Comissão ${percentual}% — Pedido #${pedido.numero}`,
          baseCalculo: base,
          percentual,
          valor,
          status: StatusComissao.PENDENTE,
        },
      });
      this.logger.log(`💸 Comissão criada: vendedor=${vendedor.nome} valor=${valor}`);
    } catch (err: any) {
      this.logger.error(`Erro ao criar comissão (nfe.emitida): ${err.message}`, err.stack);
    }
  }

  /** nfe.cancelada → cancela comissões ainda PENDENTES da NF-e. */
  @OnEvent('nfe.cancelada')
  async handleNFeCancelada(payload: { tenantId: string; nfeId: string }) {
    try {
      const res = await this.prisma.comissao.updateMany({
        where: { tenantId: payload.tenantId, nfeId: payload.nfeId, status: StatusComissao.PENDENTE },
        data: { status: StatusComissao.CANCELADA },
      });
      if (res.count > 0) {
        this.logger.log(`↩️ ${res.count} comissão(ões) cancelada(s) por nfe.cancelada`);
      }
    } catch (err: any) {
      this.logger.error(`Erro ao cancelar comissão (nfe.cancelada): ${err.message}`, err.stack);
    }
  }

  /**
   * Fecha as comissões PENDENTES em título(s) a pagar, uma por vendedor.
   * Cada título é categorizado no Plano de Contas (CONTA.COMISSOES).
   */
  async fechar(tenantId: string, usuario: UsuarioCtx, dto: FecharComissaoDto) {
    const where: any = { tenantId, status: StatusComissao.PENDENTE };
    if (dto.vendedorId) where.vendedorId = dto.vendedorId;
    if (dto.dataInicio || dto.dataFim) {
      where.competencia = {};
      if (dto.dataInicio) where.competencia.gte = new Date(dto.dataInicio);
      if (dto.dataFim) where.competencia.lte = new Date(dto.dataFim);
    }

    const pendentes = await this.prisma.comissao.findMany({
      where,
      include: { vendedor: true },
    });
    if (pendentes.length === 0) {
      throw new BadRequestException('Não há comissões pendentes no filtro informado.');
    }

    // Agrupa por vendedor.
    const porVendedor = new Map<string, typeof pendentes>();
    for (const c of pendentes) {
      const arr = porVendedor.get(c.vendedorId) || [];
      arr.push(c);
      porVendedor.set(c.vendedorId, arr);
    }

    const titulos: { vendedor: string; contaPagarId: string; valor: number; comissoes: number }[] = [];

    for (const [vendedorId, lista] of porVendedor) {
      const vendedor = lista[0].vendedor;
      const total = sumMoney(lista.map((c) => c.valor));
      if (total <= 0) continue;

      const contas = await this.contasPagar.create(tenantId, usuario, {
        fornecedorId: vendedor.fornecedorId || undefined,
        filialId: lista[0].filialId || undefined,
        descricao: `Comissões — ${vendedor.nome}`,
        valorTotal: total,
        dataVencimento: dto.dataVencimento,
        planoContasCodigo: CONTA.COMISSOES,
      });
      const contaPagarId = (contas[0] as any).id as string;

      await this.prisma.comissao.updateMany({
        where: { id: { in: lista.map((c) => c.id) } },
        data: { status: StatusComissao.FECHADA, contaPagarId, dataFechamento: new Date() },
      });

      titulos.push({ vendedor: vendedor.nome, contaPagarId, valor: total, comissoes: lista.length });
    }

    return { titulos, totalTitulos: titulos.length };
  }
}
