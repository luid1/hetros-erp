import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, TipoDocTransporte, StatusDocTransporte } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { money } from '../../common/utils/money.util';
import { proximoNumero } from '../../common/utils/sequencia.util';

interface CriarDocDto {
  filialId: string;
  tipo: TipoDocTransporte | 'MDFE' | 'CTE';
  placa: string;
  motorista?: string;
  ufIni: string;
  ufFim: string;
  valor?: number;
  serie?: string;
  observacoes?: string;
  nfes?: { numero: number; valor: number }[];
}

/**
 * Documentos de transporte MDF-e / CT-e (Frente F.1).
 * Persiste no backend mesmo em MODO SIMULAÇÃO (campo `simulacao=true`), garantindo
 * histórico e auditoria antes da integração real com a SEFAZ (Frente F.3).
 */
@Injectable()
export class DocumentosTransporteService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, filialId?: string, tipo?: string) {
    const docs = await this.prisma.documentoTransporte.findMany({
      where: {
        tenantId,
        ...(filialId && { filialId }),
        ...(tipo && { tipo: tipo as TipoDocTransporte }),
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return docs.map((d) => ({
      ...d,
      valor: money(d.valor),
      nfes: Array.isArray(d.nfesJson) ? d.nfesJson : [],
    }));
  }

  async create(tenantId: string, usuarioId: string, dto: CriarDocDto) {
    if (!dto.filialId) throw new BadRequestException('Selecione a filial.');
    if (!dto.placa?.trim()) throw new BadRequestException('Informe a placa do veículo.');
    const tipo = (dto.tipo as string) === 'CTE' ? TipoDocTransporte.CTE : TipoDocTransporte.MDFE;

    const nfes = Array.isArray(dto.nfes) ? dto.nfes : [];
    if (tipo === TipoDocTransporte.MDFE && nfes.length === 0)
      throw new BadRequestException('Vincule ao menos uma NF-e ao manifesto.');

    const valor = money(dto.valor && Number(dto.valor) > 0 ? dto.valor : nfes.reduce((s, n) => s + (Number(n.valor) || 0), 0));

    // Numeração sequencial atômica por tenant+filial+tipo.
    const numero = await proximoNumero(this.prisma, tenantId, `doc-transp:${dto.filialId}:${tipo}`);

    return this.prisma.documentoTransporte.create({
      data: {
        tenantId,
        filialId: dto.filialId,
        tipo,
        numero,
        serie: dto.serie || '1',
        placa: dto.placa.toUpperCase().trim(),
        motorista: dto.motorista || null,
        ufIni: dto.ufIni || 'SP',
        ufFim: dto.ufFim || 'SP',
        valor: new Prisma.Decimal(valor),
        nfesJson: nfes as any,
        status: StatusDocTransporte.ABERTO,
        simulacao: true,
        observacoes: dto.observacoes || null,
        usuarioId,
      },
    });
  }

  async atualizarStatus(tenantId: string, id: string, status: string) {
    const doc = await this.prisma.documentoTransporte.findFirst({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('Documento não encontrado.');
    const novo = status as StatusDocTransporte;
    if (!Object.values(StatusDocTransporte).includes(novo))
      throw new BadRequestException('Status inválido.');
    if (doc.status === StatusDocTransporte.CANCELADO)
      throw new BadRequestException('Documento cancelado não pode mudar de status.');
    return this.prisma.documentoTransporte.update({ where: { id }, data: { status: novo } });
  }
}
