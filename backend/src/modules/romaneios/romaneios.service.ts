import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RomaneiosService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return [];
  }
}
