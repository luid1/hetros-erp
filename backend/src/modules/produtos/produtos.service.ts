import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProdutosService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.produto.findMany({
      where: { tenantId, ativo: true },
      include: { unidadeMedida: { select: { sigla: true } } },
      orderBy: { descricao: 'asc' },
      take: 200,
    });
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
