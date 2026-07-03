import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VeiculosService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: any) {
    const placa = (dto.placa || '').toUpperCase().trim();
    if (!placa) throw new ConflictException('Informe a placa.');
    const exists = await this.prisma.veiculo.findFirst({ where: { tenantId, placa } });
    if (exists) throw new ConflictException('Já existe um veículo com esta placa.');
    return this.prisma.veiculo.create({ data: { tenantId, ...this.sanitize({ ...dto, placa }) } });
  }

  async findAll(tenantId: string, search?: string) {
    return this.prisma.veiculo.findMany({
      where: {
        tenantId,
        ...(search && {
          OR: [
            { placa: { contains: search, mode: 'insensitive' as any } },
            { modelo: { contains: search, mode: 'insensitive' as any } },
            { motoristaPadrao: { contains: search, mode: 'insensitive' as any } },
          ],
        }),
      },
      include: { transportadora: { select: { nomeFantasia: true, razaoSocial: true } } },
      orderBy: [{ ativo: 'desc' }, { placa: 'asc' }],
    });
  }

  async findOne(tenantId: string, id: string) {
    const v = await this.prisma.veiculo.findFirst({ where: { id, tenantId } });
    if (!v) throw new NotFoundException('Veículo não encontrado.');
    return v;
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    return this.prisma.veiculo.update({ where: { id }, data: this.sanitize(dto) });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    // Inativa (não apaga) — pode ter romaneios históricos vinculados
    return this.prisma.veiculo.update({ where: { id }, data: { ativo: false } });
  }

  private sanitize(dto: any) {
    const out: any = { ...dto };
    delete out.id; delete out.tenantId; delete out.transportadora; delete out.romaneios;
    if (out.placa) out.placa = String(out.placa).toUpperCase().trim();
    if (out.uf) out.uf = String(out.uf).toUpperCase().slice(0, 2);
    // Numéricos
    for (const campo of ['capacidadeKg', 'capacidadeM3']) {
      if (out[campo] === '' || out[campo] === null || out[campo] === undefined) delete out[campo];
      else out[campo] = Number(out[campo]);
    }
    for (const campo of ['capacidadeCaixasH', 'anoFabricacao']) {
      if (out[campo] === '' || out[campo] === null || out[campo] === undefined) delete out[campo];
      else out[campo] = parseInt(out[campo], 10);
    }
    if (out.transportadoraId === '' ) out.transportadoraId = null;
    return out;
  }
}
