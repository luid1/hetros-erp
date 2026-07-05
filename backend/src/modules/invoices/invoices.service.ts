import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, InvoiceStatus, TaxType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toCents, fromCents, assertValorPositivo } from '../../common/utils/money.util';

/** Filtros da listagem de Notas Fiscais (Invoices). */
export interface ListarInvoiceDto {
  status?: InvoiceStatus;
  orderId?: string;
  customerId?: string;
  dataIni?: string; // filtra por createdAt >= dataIni
  dataFim?: string; // filtra por createdAt <= dataFim
  search?: string; // invoiceNumber
}

/** Definição de um imposto incidente sobre a nota (alíquota em percentual). */
export interface InvoiceTaxInput {
  type: TaxType;
  rate: number; // percentual (ex: 18 para 18%)
}

/** Geração de uma nota fiscal a partir de um pedido de venda. */
export interface GerarInvoiceDto {
  orderId: string;
  customerId?: string; // opcional: se ausente, herdado do pedido
  netValue?: number; // opcional: se ausente, herdado do valorTotal do pedido (em reais)
  series?: string; // default '1'
  invoiceNumber?: string; // opcional; se ausente, gerado sequencialmente
  taxes?: InvoiceTaxInput[]; // impostos incidentes
}

/** Contexto do usuário autenticado (para a trilha de auditoria imutável). */
export interface UsuarioCtx {
  id: string;
  nome?: string;
}

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  // ───────────────────────── Leitura ─────────────────────────

  async findAll(tenantId: string, filtros: ListarInvoiceDto = {}) {
    const where: Prisma.InvoiceWhereInput = {
      tenantId,
      ...(filtros.status && { status: filtros.status }),
      ...(filtros.orderId && { orderId: filtros.orderId }),
      ...(filtros.customerId && { customerId: filtros.customerId }),
      ...((filtros.dataIni || filtros.dataFim) && {
        createdAt: {
          ...(filtros.dataIni && { gte: new Date(filtros.dataIni) }),
          ...(filtros.dataFim && { lte: this.fimDoDia(filtros.dataFim) }),
        },
      }),
      ...(filtros.search && {
        invoiceNumber: { contains: filtros.search, mode: 'insensitive' },
      }),
    };

    const registros = await this.prisma.invoice.findMany({
      where,
      include: { taxes: true },
      orderBy: [{ createdAt: 'desc' }],
    });

    return registros.map((i) => this.serializar(i));
  }

  /** KPIs consolidados (valores em reais). */
  async resumo(tenantId: string, filtros: ListarInvoiceDto = {}) {
    const notas = await this.findAll(tenantId, filtros);
    const porStatus = (s: InvoiceStatus) => notas.filter((n) => n.status === s);
    const soma = (arr: { grossValue: number }[]) =>
      fromCents(arr.reduce((acc, n) => acc + toCents(n.grossValue), 0));

    return {
      totalNotas: notas.length,
      valorBrutoTotal: soma(notas),
      valorImpostosTotal: fromCents(
        notas.reduce((acc, n) => acc + toCents(n.taxValue), 0),
      ),
      valorLiquidoTotal: fromCents(
        notas.reduce((acc, n) => acc + toCents(n.netValue), 0),
      ),
      rascunhos: porStatus(InvoiceStatus.DRAFT).length,
      emitidas: porStatus(InvoiceStatus.ISSUED).length,
      canceladas: porStatus(InvoiceStatus.CANCELED).length,
      comErro: porStatus(InvoiceStatus.ERRONEOUS).length,
      valorEmitido: soma(porStatus(InvoiceStatus.ISSUED)),
    };
  }

  async findOne(tenantId: string, id: string) {
    const nota = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { taxes: true, auditLogs: { orderBy: { changedAt: 'desc' } } },
    });
    if (!nota) throw new NotFoundException('Nota fiscal não encontrada.');
    return this.serializar(nota);
  }

  // ───────────────────────── Escrita ─────────────────────────

  /**
   * Gera uma nota fiscal (status DRAFT) a partir de um pedido de venda. Calcula os
   * impostos em CENTAVOS (nunca float) sobre o valor líquido e consolida o valor
   * bruto. Persiste as linhas de imposto e registra a criação na trilha imutável.
   */
  async gerar(tenantId: string, usuario: UsuarioCtx, dto: GerarInvoiceDto) {
    if (!dto.orderId?.trim()) throw new BadRequestException('Informe o pedido de origem (orderId).');

    // Tenta herdar valor líquido e cliente do pedido de venda (integração ERP).
    // Se o orderId não corresponder a um Pedido cadastrado, usa os valores do DTO.
    const pedido = await this.prisma.pedido.findFirst({
      where: { id: dto.orderId, tenantId },
      select: { valorTotal: true, clienteId: true, status: true },
    });

    if (pedido) {
      if (pedido.status === 'CANCELADO')
        throw new BadRequestException('Pedido cancelado não pode ser faturado.');
      const jaFaturado = await this.prisma.invoice.count({
        where: { tenantId, orderId: dto.orderId, status: { not: InvoiceStatus.CANCELED } },
      });
      if (jaFaturado > 0)
        throw new BadRequestException('Já existe nota fiscal ativa para este pedido.');
    }

    const customerId = dto.customerId?.trim() || pedido?.clienteId || '';
    if (!customerId) throw new BadRequestException('Informe o cliente (customerId).');

    const netValue = dto.netValue ?? (pedido ? Number(pedido.valorTotal) : undefined);
    assertValorPositivo(netValue, 'netValue');

    const netCents = toCents(netValue);
    const taxesInput = dto.taxes ?? [];

    // Calcula cada imposto em centavos: valor = round(net * percentual / 100).
    const taxRows = taxesInput.map((t) => {
      const ratePercent = Number(t.rate) || 0;
      if (ratePercent < 0) throw new BadRequestException('Alíquota não pode ser negativa.');
      const valueCents = Math.round((netCents * ratePercent) / 100);
      return {
        type: t.type,
        rate: Math.round(ratePercent * 100), // pontos-base (18% → 1800)
        value: valueCents,
      };
    });

    const taxCents = taxRows.reduce((acc, t) => acc + t.value, 0);
    const grossCents = netCents + taxCents;
    const invoiceNumber = dto.invoiceNumber?.trim() || (await this.proximoNumero(tenantId));

    const criada = await this.prisma.$transaction(async (tx) => {
      const nota = await tx.invoice.create({
        data: {
          tenantId,
          invoiceNumber,
          series: dto.series?.trim() || '1',
          status: InvoiceStatus.DRAFT,
          orderId: dto.orderId,
          customerId,
          netValue: netCents,
          taxValue: taxCents,
          grossValue: grossCents,
          createdById: usuario.id,
          taxes: { create: taxRows },
        },
        include: { taxes: true },
      });

      await tx.invoiceAuditLog.create({
        data: {
          invoiceId: nota.id,
          action: 'GENERATE',
          oldStatus: null,
          newStatus: InvoiceStatus.DRAFT,
          userId: usuario.id,
          message: `Nota ${invoiceNumber} gerada a partir do pedido ${dto.orderId}${usuario.nome ? ` por ${usuario.nome}` : ''}.`,
        },
      });

      return nota;
    });

    return this.serializar(criada);
  }

  /**
   * Transmite a nota à SEFAZ (DRAFT/ERRONEOUS → ISSUED). Protegido por RBAC
   * 'FISCAL:OPERAR' no controller. Marca issuedAt e grava a trilha imutável.
   */
  async transmitir(tenantId: string, usuario: UsuarioCtx, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const nota = await tx.invoice.findFirst({ where: { id, tenantId } });
      if (!nota) throw new NotFoundException('Nota fiscal não encontrada.');
      if (nota.status === InvoiceStatus.ISSUED)
        throw new BadRequestException('Nota já está emitida/autorizada.');
      if (nota.status === InvoiceStatus.CANCELED)
        throw new BadRequestException('Nota cancelada não pode ser transmitida.');

      const statusAnterior = nota.status;
      const atualizada = await tx.invoice.update({
        where: { id: nota.id },
        data: { status: InvoiceStatus.ISSUED, issuedAt: new Date() },
        include: { taxes: true },
      });

      await tx.invoiceAuditLog.create({
        data: {
          invoiceId: nota.id,
          action: 'TRANSMIT_SEFAZ',
          oldStatus: statusAnterior,
          newStatus: InvoiceStatus.ISSUED,
          userId: usuario.id,
          message: `Nota ${nota.invoiceNumber} autorizada pela SEFAZ${usuario.nome ? ` por ${usuario.nome}` : ''}.`,
        },
      });

      return this.serializar(atualizada);
    });
  }

  /**
   * Marca a nota como ERRONEOUS (rejeição da SEFAZ / API Fiscal), preservando o
   * motivo na trilha imutável. Protegido por RBAC 'FISCAL:OPERAR'.
   */
  async marcarErro(tenantId: string, usuario: UsuarioCtx, id: string, motivo?: string) {
    return this.prisma.$transaction(async (tx) => {
      const nota = await tx.invoice.findFirst({ where: { id, tenantId } });
      if (!nota) throw new NotFoundException('Nota fiscal não encontrada.');
      if (nota.status === InvoiceStatus.CANCELED)
        throw new BadRequestException('Nota cancelada não pode ser reprocessada.');

      const statusAnterior = nota.status;
      const atualizada = await tx.invoice.update({
        where: { id: nota.id },
        data: { status: InvoiceStatus.ERRONEOUS },
        include: { taxes: true },
      });

      await tx.invoiceAuditLog.create({
        data: {
          invoiceId: nota.id,
          action: 'REJECT_SEFAZ',
          oldStatus: statusAnterior,
          newStatus: InvoiceStatus.ERRONEOUS,
          userId: usuario.id,
          message: motivo || 'Rejeitada pela SEFAZ / API Fiscal.',
        },
      });

      return this.serializar(atualizada);
    });
  }

  /**
   * Cancela uma nota emitida (ISSUED → CANCELED). Protegido por RBAC
   * 'FISCAL:OPERAR'. Não permite cancelar rascunho (basta descartar) nem re-cancelar.
   */
  async cancelar(tenantId: string, usuario: UsuarioCtx, id: string, motivo?: string) {
    return this.prisma.$transaction(async (tx) => {
      const nota = await tx.invoice.findFirst({ where: { id, tenantId } });
      if (!nota) throw new NotFoundException('Nota fiscal não encontrada.');
      if (nota.status === InvoiceStatus.CANCELED)
        throw new BadRequestException('Nota já está cancelada.');
      if (nota.status !== InvoiceStatus.ISSUED)
        throw new BadRequestException('Só é possível cancelar uma nota emitida/autorizada.');

      const statusAnterior = nota.status;
      const atualizada = await tx.invoice.update({
        where: { id: nota.id },
        data: { status: InvoiceStatus.CANCELED },
        include: { taxes: true },
      });

      await tx.invoiceAuditLog.create({
        data: {
          invoiceId: nota.id,
          action: 'CANCEL',
          oldStatus: statusAnterior,
          newStatus: InvoiceStatus.CANCELED,
          userId: usuario.id,
          message: motivo || 'Nota cancelada.',
        },
      });

      return this.serializar(atualizada);
    });
  }

  // ───────────────────────── Helpers ─────────────────────────

  /** Gera a próxima numeração sequencial da nota (escopo do tenant). */
  private async proximoNumero(tenantId: string): Promise<string> {
    const total = await this.prisma.invoice.count({ where: { tenantId } });
    const seq = total + 1;
    // Formato 000.NNN.NNN (padding em 9 dígitos).
    const padded = String(seq).padStart(9, '0');
    return `${padded.slice(0, 3)}.${padded.slice(3, 6)}.${padded.slice(6)}`;
  }

  /**
   * Converte os inteiros em centavos/pontos-base do banco para reais/percentuais
   * amigáveis ao frontend, mantendo os campos originais.
   */
  private serializar(i: any) {
    return {
      ...i,
      netValue: fromCents(i.netValue),
      taxValue: fromCents(i.taxValue),
      grossValue: fromCents(i.grossValue),
      taxes: Array.isArray(i.taxes)
        ? i.taxes.map((t: any) => ({
            ...t,
            rate: t.rate / 100, // pontos-base → percentual
            value: fromCents(t.value),
          }))
        : undefined,
    };
  }

  private fimDoDia(iso: string) {
    const x = new Date(iso);
    x.setHours(23, 59, 59, 999);
    return x;
  }
}
