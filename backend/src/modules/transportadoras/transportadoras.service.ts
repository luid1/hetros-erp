import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TransportadorasService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: any) {
    const exists = await this.prisma.transportadora.findFirst({ where: { tenantId, cnpj: dto.cnpj } });
    if (exists) throw new ConflictException('Transportadora já cadastrada com este CPF/CNPJ.');
    return this.prisma.transportadora.create({ data: { tenantId, ...this.sanitize(dto) } });
  }

  async findAll(tenantId: string, search?: string, regiao?: string) {
    return this.prisma.transportadora.findMany({
      where: {
        tenantId,
        ...(regiao && { regiaoAtuacao: { contains: regiao, mode: 'insensitive' as any } }),
        ...(search && {
          OR: [
            { razaoSocial: { contains: search, mode: 'insensitive' as any } },
            { nomeFantasia: { contains: search, mode: 'insensitive' as any } },
            { cnpj: { contains: search } },
            { placaPrincipal: { contains: search, mode: 'insensitive' as any } },
          ],
        }),
      },
      orderBy: { razaoSocial: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const t = await this.prisma.transportadora.findFirst({ where: { id, tenantId } });
    if (!t) throw new NotFoundException('Transportadora não encontrada.');
    return t;
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    return this.prisma.transportadora.update({ where: { id }, data: this.sanitize(dto) });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.transportadora.delete({ where: { id } });
  }

  private sanitize(dto: any) {
    const out: any = { ...dto };
    delete out.id; delete out.tenantId; delete out.createdAt;
    if (out.freteBaseKg !== undefined && out.freteBaseKg !== null && out.freteBaseKg !== '') out.freteBaseKg = Number(out.freteBaseKg);
    else delete out.freteBaseKg;
    if (out.endereco && out.enderecoJson === undefined) out.enderecoJson = out.endereco;
    if (!out.enderecoJson) out.enderecoJson = {};
    delete out.endereco;
    return out;
  }
}
