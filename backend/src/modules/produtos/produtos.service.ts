import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProdutosService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, q?: string) {
    return this.prisma.produto.findMany({
      where: {
        tenantId, ativo: true,
        ...(q && {
          OR: [
            { descricao: { contains: q, mode: 'insensitive' as any } },
            { codigo: { contains: q, mode: 'insensitive' as any } },
            { codigoBarras: { contains: q } },
          ],
        }),
      },
      include: { unidadeMedida: { select: { sigla: true } } },
      orderBy: { descricao: 'asc' },
      take: 500,
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    const p = await this.prisma.produto.findFirst({ where: { id, tenantId } });
    if (!p) throw new NotFoundException('Produto não encontrado.');
    const num = (v: any) => (v === '' || v === null || v === undefined ? undefined : Number(v));
    await this.prisma.produto.update({
      where: { id },
      data: {
        descricao: dto.descricao ?? undefined,
        codigo: dto.codigo ?? undefined,
        codigoBarras: dto.codigoBarras ?? undefined,
        ncm: dto.ncm ?? undefined,
        cfop: dto.cfop ?? undefined,
        categoria: dto.categoria ?? undefined,
        grupo: dto.grupo ?? undefined,
        marca: dto.marca ?? undefined,
        pesoLiquido: num(dto.pesoLiquido),
        pesoBruto: num(dto.pesoBruto),
        precoVenda: num(dto.precoVenda),
      },
    });
    return this.prisma.produto.findUnique({ where: { id }, include: { unidadeMedida: { select: { sigla: true } } } });
  }

  /**
   * Busca rápida (autocomplete) por código, descrição ou código de barras.
   * Já devolve o saldo disponível (quantidade - reservada) na filial informada.
   */
  async search(tenantId: string, q: string, filialId?: string) {
    const produtos = await this.prisma.produto.findMany({
      where: {
        tenantId,
        ativo: true,
        ...(q && {
          OR: [
            { descricao: { contains: q, mode: 'insensitive' as any } },
            { codigo: { contains: q, mode: 'insensitive' as any } },
            { codigoBarras: { contains: q } },
          ],
        }),
      },
      include: {
        unidadeMedida: { select: { sigla: true } },
        estoques: filialId
          ? { where: { filialId }, select: { quantidade: true, quantidadeReservada: true } }
          : { select: { quantidade: true, quantidadeReservada: true } },
      },
      orderBy: { descricao: 'asc' },
      take: 30,
    });

    return produtos.map((p) => {
      const disponivel = p.estoques.reduce(
        (s, e) => s + (Number(e.quantidade) - Number(e.quantidadeReservada)),
        0,
      );
      return {
        id: p.id,
        codigo: p.codigo,
        codigoBarras: p.codigoBarras,
        descricao: p.descricao,
        ncm: p.ncm,
        cfop: p.cfop,
        unidade: p.unidadeMedida?.sigla || 'UN',
        precoVenda: Number(p.precoVenda),
        estoqueDisponivel: disponivel,
      };
    });
  }
}
