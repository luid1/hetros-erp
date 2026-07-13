import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CriarVendedorDto, AtualizarVendedorDto } from './dto/vendedor.dto';

@Injectable()
export class VendedoresService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, incluirInativos = false) {
    return this.prisma.vendedor.findMany({
      where: { tenantId, ...(incluirInativos ? {} : { ativo: true }) },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const v = await this.prisma.vendedor.findFirst({ where: { id, tenantId } });
    if (!v) throw new NotFoundException('Vendedor não encontrado.');
    return v;
  }

  async create(tenantId: string, dto: CriarVendedorDto) {
    return this.prisma.vendedor.create({
      data: {
        tenantId,
        nome: dto.nome.trim(),
        usuarioId: dto.usuarioId || null,
        fornecedorId: dto.fornecedorId || null,
        documento: dto.documento || null,
        email: dto.email || null,
        telefone: dto.telefone || null,
        percentualPadrao: dto.percentualPadrao ?? 0,
      },
    });
  }

  async update(tenantId: string, id: string, dto: AtualizarVendedorDto) {
    await this.findOne(tenantId, id);
    return this.prisma.vendedor.update({
      where: { id },
      data: {
        ...(dto.nome !== undefined ? { nome: dto.nome.trim() } : {}),
        ...(dto.usuarioId !== undefined ? { usuarioId: dto.usuarioId || null } : {}),
        ...(dto.fornecedorId !== undefined ? { fornecedorId: dto.fornecedorId || null } : {}),
        ...(dto.documento !== undefined ? { documento: dto.documento || null } : {}),
        ...(dto.email !== undefined ? { email: dto.email || null } : {}),
        ...(dto.telefone !== undefined ? { telefone: dto.telefone || null } : {}),
        ...(dto.percentualPadrao !== undefined ? { percentualPadrao: dto.percentualPadrao } : {}),
        ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    // Soft delete: inativa (mantém histórico de comissões).
    return this.prisma.vendedor.update({ where: { id }, data: { ativo: false } });
  }
}
