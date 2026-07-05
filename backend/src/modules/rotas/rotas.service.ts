import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Leituras de rotas para a Torre de Controle (web) e o App do Motorista. */
@Injectable()
export class RotasService {
  constructor(private readonly prisma: PrismaService) {}

  private serializarStop(s: any) {
    return {
      id: s.id,
      pedidoId: s.pedidoId,
      numeroPedido: s.numeroPedido,
      clienteNome: s.clienteNome,
      cep: s.cep,
      endereco: s.endereco,
      ordem: s.ordem,
      pesoKg: Number(s.pesoKg),
      volumes: s.volumes,
      status: s.status,
      dataHoraEntrega: s.dataHoraEntrega,
      recebedorNome: s.recebedorNome,
      latitude: s.latitude != null ? Number(s.latitude) : null,
      longitude: s.longitude != null ? Number(s.longitude) : null,
      sefazStatus: s.sefazStatus,
      sefazProtocolo: s.sefazProtocolo,
    };
  }

  private serializarRoute(r: any) {
    return {
      id: r.id,
      dataRota: r.dataRota,
      status: r.status,
      regiao: r.regiao,
      motoristaNome: r.motoristaNome,
      placaVeiculo: r.placaVeiculo,
      origemOtimizacao: r.origemOtimizacao,
      capacidadeKg: Number(r.capacidadeKg),
      pesoTotalKg: Number(r.pesoTotalKg),
      volumesTotal: r.volumesTotal,
      ocupacaoPct: Number(r.capacidadeKg)
        ? Math.round((Number(r.pesoTotalKg) / Number(r.capacidadeKg)) * 100)
        : 0,
      stops: (r.stops || []).map((s: any) => this.serializarStop(s)),
    };
  }

  /** Rotas de um dia/filial para a Torre de Controle. */
  async listar(tenantId: string, filialId: string, dataRota?: string) {
    const where: any = { tenantId, filialId };
    if (dataRota) {
      const dia = dataRota.split('T')[0];
      where.dataRota = {
        gte: new Date(`${dia}T00:00:00`),
        lte: new Date(`${dia}T23:59:59.999`),
      };
    }
    const rotas = await this.prisma.route.findMany({
      where,
      include: { stops: { orderBy: { ordem: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return rotas.map((r) => this.serializarRoute(r));
  }

  async findOne(tenantId: string, id: string) {
    const r = await this.prisma.route.findFirst({
      where: { id, tenantId },
      include: { stops: { orderBy: { ordem: 'asc' } } },
    });
    if (!r) throw new NotFoundException('Rota não encontrada');
    return this.serializarRoute(r);
  }

  /** Rotas ativas do motorista (App Mobile) — paradas na ordem de entrega. */
  async doMotorista(tenantId: string, motoristaNome: string) {
    const rotas = await this.prisma.route.findMany({
      where: {
        tenantId,
        motoristaNome,
        status: { in: ['PLANNED', 'DISPATCHED'] },
      },
      include: { stops: { orderBy: { ordem: 'asc' } } },
      orderBy: { dataRota: 'asc' },
    });
    return rotas.map((r) => this.serializarRoute(r));
  }
}
