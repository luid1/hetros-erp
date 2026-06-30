import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FiliaisService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.filial.findMany({
      where: { tenantId },
      orderBy: { codigo: 'asc' },
    });
  }

  async updateRegime(tenantId: string, id: string, dto: { regimeTributario?: string; crt?: string; cnpj?: string; ie?: string }) {
    const filial = await this.prisma.filial.findFirst({ where: { id, tenantId } });
    if (!filial) throw new NotFoundException('Filial não encontrada.');
    return this.prisma.filial.update({
      where: { id },
      data: {
        ...(dto.regimeTributario && { regimeTributario: dto.regimeTributario }),
        ...(dto.crt && { crt: dto.crt }),
        ...(dto.cnpj !== undefined && { cnpj: dto.cnpj }),
        ...(dto.ie !== undefined && { ie: dto.ie }),
      },
    });
  }
}
