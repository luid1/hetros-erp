import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EstoqueService } from '../estoque/estoque.service';
import { StatusOrdemCompra, TipoMovimentacao } from '@prisma/client';

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Compras & Suprimentos — Ordem de Compra (OC).
 * Relação 1:N entre OrdemCompra e ItemOrdemCompra. O recebimento integra com o
 * estoque (entrada) e com o financeiro (contas a pagar).
 */
@Injectable()
export class ComprasService {
  constructor(private prisma: PrismaService, private estoque: EstoqueService) {}

  // ── Helpers ──
  /** Normaliza os itens do DTO e calcula subtotal/total. */
  private prepararItens(itens: any[]) {
    if (!Array.isArray(itens) || itens.length === 0) throw new BadRequestException('Informe ao menos um item.');
    const preparados = itens.map((i) => {
      const quantidade = Number(i.quantidade) || 0;
      const precoUnitario = Number(i.precoUnitario) || 0;
      if (quantidade <= 0) throw new BadRequestException('Quantidade deve ser maior que zero.');
      return {
        produtoId: i.produtoId || null,
        descricao: (i.descricao || '').trim(),
        unidade: i.unidade || 'KG',
        quantidade,
        precoUnitario,
        subtotal: r2(quantidade * precoUnitario),
      };
    });
    const valorTotal = r2(preparados.reduce((s, i) => s + i.subtotal, 0));
    return { preparados, valorTotal };
  }

  // ── READ ──
  findAll(tenantId: string, filtros?: { status?: string; fornecedorId?: string; search?: string }) {
    return this.prisma.ordemCompra.findMany({
      where: {
        tenantId,
        ...(filtros?.status && { status: filtros.status as StatusOrdemCompra }),
        ...(filtros?.fornecedorId && { fornecedorId: filtros.fornecedorId }),
        ...(filtros?.search && {
          OR: [
            { fornecedor: { razaoSocial: { contains: filtros.search, mode: 'insensitive' as any } } },
            ...(Number.isNaN(Number(filtros.search)) ? [] : [{ numero: Number(filtros.search) }]),
          ],
        }),
      },
      include: { fornecedor: { select: { razaoSocial: true, nomeFantasia: true } }, _count: { select: { itens: true } } },
      orderBy: { numero: 'desc' },
      take: 300,
    });
  }

  async findOne(tenantId: string, id: string) {
    const oc = await this.prisma.ordemCompra.findFirst({
      where: { id, tenantId },
      include: {
        fornecedor: true,
        itens: { include: { produto: { select: { codigo: true, descricao: true } } } },
      },
    });
    if (!oc) throw new NotFoundException('Ordem de compra não encontrada.');
    return oc;
  }

  /**
   * Histórico de compras de um produto: as últimas OCs que incluíram esse produto,
   * com fornecedor, data, quantidade, preço e status. Alimenta o painel "quem pediu
   * das últimas vezes" no App do Comprador.
   */
  async historicoProduto(tenantId: string, produtoId: string) {
    const itens = await this.prisma.itemOrdemCompra.findMany({
      where: { produtoId, ordem: { tenantId } },
      include: {
        ordem: {
          select: {
            id: true,
            numero: true,
            status: true,
            dataEmissao: true,
            fornecedor: { select: { razaoSocial: true, nomeFantasia: true } },
          },
        },
      },
      orderBy: { ordem: { dataEmissao: 'desc' } },
      take: 12,
    });

    return itens.map((it) => ({
      ordemId: it.ordem.id,
      numero: it.ordem.numero,
      status: it.ordem.status,
      data: it.ordem.dataEmissao,
      fornecedor: it.ordem.fornecedor?.nomeFantasia || it.ordem.fornecedor?.razaoSocial || 'Fornecedor',
      quantidade: Number(it.quantidade),
      unidade: it.unidade,
      precoUnitario: Number(it.precoUnitario),
      subtotal: Number(it.subtotal),
    }));
  }

  // ── CREATE ──
  async create(tenantId: string, dto: any) {
    if (!dto.fornecedorId) throw new BadRequestException('Selecione o fornecedor.');
    const { preparados, valorTotal } = this.prepararItens(dto.itens);

    const ultimo = await this.prisma.ordemCompra.findFirst({ where: { tenantId }, orderBy: { numero: 'desc' } });
    const numero = (ultimo?.numero || 0) + 1;

    return this.prisma.ordemCompra.create({
      data: {
        tenantId,
        filialId: dto.filialId || null,
        fornecedorId: dto.fornecedorId,
        numero,
        status: StatusOrdemCompra.PENDENTE,
        condicaoPagamento: dto.condicaoPagamento || null,
        dataEntregaPrevista: dto.dataEntregaPrevista ? new Date(dto.dataEntregaPrevista) : null,
        observacoes: dto.observacoes || null,
        valorTotal,
        itens: { create: preparados },
      },
      include: { itens: true },
    });
  }

  // ── UPDATE ──
  async update(tenantId: string, id: string, dto: any) {
    const oc = await this.prisma.ordemCompra.findFirst({ where: { id, tenantId } });
    if (!oc) throw new NotFoundException('Ordem de compra não encontrada.');
    if (oc.status === 'ENTREGUE' || oc.status === 'CANCELADA') {
      throw new BadRequestException(`OC ${oc.status} não pode ser editada.`);
    }
    const { preparados, valorTotal } = this.prepararItens(dto.itens);

    // recria os itens (1:N) e atualiza o cabeçalho
    await this.prisma.itemOrdemCompra.deleteMany({ where: { ordemId: id } });
    return this.prisma.ordemCompra.update({
      where: { id },
      data: {
        fornecedorId: dto.fornecedorId ?? oc.fornecedorId,
        filialId: dto.filialId ?? oc.filialId,
        condicaoPagamento: dto.condicaoPagamento ?? oc.condicaoPagamento,
        dataEntregaPrevista: dto.dataEntregaPrevista ? new Date(dto.dataEntregaPrevista) : oc.dataEntregaPrevista,
        observacoes: dto.observacoes ?? oc.observacoes,
        valorTotal,
        itens: { create: preparados },
      },
      include: { itens: true },
    });
  }

  // ── DELETE ──
  async remove(tenantId: string, id: string) {
    const oc = await this.prisma.ordemCompra.findFirst({ where: { id, tenantId } });
    if (!oc) throw new NotFoundException('Ordem de compra não encontrada.');
    if (oc.status === 'ENTREGUE') throw new BadRequestException('OC entregue não pode ser excluída (já movimentou estoque).');
    await this.prisma.ordemCompra.delete({ where: { id } }); // itens caem por cascade
    return { ok: true };
  }

  // ── STATUS ──
  async mudarStatus(tenantId: string, id: string, status: StatusOrdemCompra, usuarioId: string) {
    const oc = await this.prisma.ordemCompra.findFirst({ where: { id, tenantId } });
    if (!oc) throw new NotFoundException('Ordem de compra não encontrada.');
    // Entrega passa pelo fluxo de recebimento (mexe no estoque)
    if (status === 'ENTREGUE') return this.receber(tenantId, id, usuarioId);
    return this.prisma.ordemCompra.update({ where: { id }, data: { status } });
  }

  /**
   * Recebe a OC: dá entrada no estoque de cada item com produto, gera o Contas a Pagar
   * e marca a OC como ENTREGUE.
   */
  async receber(tenantId: string, id: string, usuarioId: string) {
    const oc = await this.prisma.ordemCompra.findFirst({ where: { id, tenantId }, include: { itens: true } });
    if (!oc) throw new NotFoundException('Ordem de compra não encontrada.');
    if (oc.status === 'ENTREGUE') throw new BadRequestException('OC já foi entregue.');
    if (oc.status === 'CANCELADA') throw new BadRequestException('OC cancelada não pode ser recebida.');
    if (!oc.filialId) throw new BadRequestException('Defina a filial de destino antes de receber.');

    // 1. Entrada no estoque
    for (const item of oc.itens) {
      if (!item.produtoId) continue;
      await this.estoque.movimentar(tenantId, {
        filialId: oc.filialId,
        produtoId: item.produtoId,
        tipo: TipoMovimentacao.ENTRADA_COMPRA,
        quantidade: Number(item.quantidade),
        custoUnitario: Number(item.precoUnitario),
        usuarioId,
        observacoes: `Recebimento OC #${oc.numero}`,
      });
      await this.prisma.itemOrdemCompra.update({ where: { id: item.id }, data: { quantidadeRecebida: item.quantidade } });
    }

    // 2. Contas a pagar
    await this.prisma.contaPagar.create({
      data: {
        tenantId, filialId: oc.filialId, fornecedorId: oc.fornecedorId,
        descricao: `Compra — OC #${oc.numero}`,
        valorOriginal: oc.valorTotal,
        dataVencimento: this.vencimentoPorCondicao(oc.condicaoPagamento),
        status: 'ABERTO',
      },
    });

    // 3. Marca entregue
    return this.prisma.ordemCompra.update({
      where: { id }, data: { status: StatusOrdemCompra.ENTREGUE, dataEntregaReal: new Date() },
    });
  }

  /** Converte a condição de pagamento num vencimento simples (à vista = hoje). */
  private vencimentoPorCondicao(cond?: string | null): Date {
    const hoje = new Date();
    if (!cond || cond === 'A_VISTA') return hoje;
    const m = String(cond).match(/\d+/);
    const dias = m ? Number(m[0]) : 30;
    return new Date(hoje.getTime() + dias * 86400000);
  }
}
