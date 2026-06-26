import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TransportadorasService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return [];
  }
}
