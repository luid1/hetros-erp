import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * DeliveryConfirmationService — "Ponte Fiscal SEFAZ".
 *
 * Fluxo do canhoto digital:
 *  1. App do motorista envia assinatura (dataURL), foto e GPS de uma parada.
 *  2. Persistimos a prova de entrega no RouteStop (transação ACID + AuditLog).
 *  3. Disparamos o Evento 110130 (Comprovante de Entrega da NF-e) para a
 *     FocusNFe (ambiente de homologação) via REST.
 *  4. Gravamos protocolo/retorno da SEFAZ de volta no RouteStop.
 *
 * O passo fiscal é resiliente: uma falha na FocusNFe NÃO desfaz a prova de
 * entrega gravada — apenas marca sefazStatus = "erro" para reprocessamento.
 */

export interface ConfirmarEntregaDto {
  routeStopId: string;
  latitude: number;
  longitude: number;
  /** dataURL do canvas de assinatura (data:image/png;base64,...). */
  assinaturaBase64: string;
  /** URL ou dataURL da foto da mercadoria entregue. */
  fotoBase64?: string;
  recebedorNome: string;
  recebedorDoc?: string;
}

interface FocusNfeResposta {
  status: string; // "processado_autorizado" | "erro" | ...
  protocolo?: string;
  mensagem_sefaz?: string;
  [k: string]: unknown;
}

@Injectable()
export class DeliveryConfirmationService {
  private readonly logger = new Logger(DeliveryConfirmationService.name);

  private readonly focusBaseUrl =
    process.env.FOCUS_NFE_URL || 'https://homologacao.focusnfe.com.br';
  private readonly focusToken = process.env.FOCUS_NFE_TOKEN || '';

  constructor(private readonly prisma: PrismaService) {}

  async confirmar(
    tenantId: string,
    usuarioId: string,
    dto: ConfirmarEntregaDto,
  ) {
    if (!dto?.routeStopId) throw new BadRequestException('routeStopId é obrigatório');
    if (!dto.assinaturaBase64) throw new BadRequestException('Assinatura é obrigatória');
    if (dto.latitude == null || dto.longitude == null) {
      throw new BadRequestException('Coordenadas GPS são obrigatórias');
    }

    const stop = await this.prisma.routeStop.findFirst({
      where: { id: dto.routeStopId, tenantId },
    });
    if (!stop) throw new NotFoundException('Parada de rota não encontrada');
    if (stop.status === 'DELIVERED') {
      throw new BadRequestException('Esta parada já foi confirmada como entregue.');
    }

    const agora = new Date();

    // 1) Persistir a prova de entrega (ACID)
    const atualizado = await this.prisma.$transaction(async (tx) => {
      const s = await tx.routeStop.update({
        where: { id: stop.id },
        data: {
          status: 'DELIVERED',
          latitude: new Prisma.Decimal(dto.latitude.toFixed(7)),
          longitude: new Prisma.Decimal(dto.longitude.toFixed(7)),
          dataHoraEntrega: agora,
          stringAssinatura: dto.assinaturaBase64,
          linkFoto: dto.fotoBase64 || null,
          recebedorNome: dto.recebedorNome,
          recebedorDoc: dto.recebedorDoc || null,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          usuarioId,
          modulo: 'LOGISTICA',
          acao: 'CONFIRMAR_ENTREGA',
          entidade: 'RouteStop',
          entidadeId: s.id,
          dadosDepois: {
            pedido: s.numeroPedido,
            recebedor: dto.recebedorNome,
            lat: dto.latitude,
            lng: dto.longitude,
            entregueEm: agora.toISOString(),
          } as unknown as Prisma.InputJsonValue,
        },
      });

      // Se todas as paradas da rota foram entregues, fecha a rota.
      const pendentes = await tx.routeStop.count({
        where: { routeId: s.routeId, status: { in: ['PENDING', 'IN_TRANSIT'] } },
      });
      if (pendentes === 0) {
        await tx.route.update({
          where: { id: s.routeId },
          data: { status: 'COMPLETED' },
        });
      }
      return s;
    });

    // 2) Ponte fiscal SEFAZ (fora da transação de banco; falha não reverte entrega)
    const fiscal = await this.enviarEvento110130(atualizado.pedidoId, {
      dataHoraEntrega: agora,
      latitude: dto.latitude,
      longitude: dto.longitude,
      recebedorNome: dto.recebedorNome,
      recebedorDoc: dto.recebedorDoc,
      assinaturaBase64: dto.assinaturaBase64,
    });

    await this.prisma.routeStop.update({
      where: { id: atualizado.id },
      data: {
        sefazStatus: fiscal.status,
        sefazProtocolo: fiscal.protocolo || null,
        sefazPayload: JSON.stringify(fiscal.raw).slice(0, 8000),
      },
    });

    return {
      routeStopId: atualizado.id,
      entregueEm: agora.toISOString(),
      sefaz: { status: fiscal.status, protocolo: fiscal.protocolo || null },
    };
  }

  /**
   * Dispara o Evento 110130 (Comprovante de Entrega da NF-e) para a FocusNFe.
   * Autenticação HTTP Basic: token no usuário, senha vazia.
   */
  private async enviarEvento110130(
    pedidoId: string,
    prova: {
      dataHoraEntrega: Date;
      latitude: number;
      longitude: number;
      recebedorNome: string;
      recebedorDoc?: string;
      assinaturaBase64: string;
    },
  ): Promise<{ status: string; protocolo?: string; raw: unknown }> {
    // Recupera a NF-e vinculada ao pedido (chave de acesso é o "ref" fiscal).
    const nfe = await this.prisma.nFe.findFirst({
      where: { pedidoId },
      select: { chaveAcesso: true, numero: true },
    });

    if (!nfe?.chaveAcesso) {
      this.logger.warn(
        `Pedido ${pedidoId} sem NF-e/chave — evento 110130 não enviado.`,
      );
      return { status: 'sem_nfe', raw: { motivo: 'pedido sem NF-e vinculada' } };
    }

    if (!this.focusToken) {
      this.logger.warn('FOCUS_NFE_TOKEN ausente — evento 110130 simulado.');
      return {
        status: 'simulado',
        raw: { motivo: 'token FocusNFe não configurado (.env)' },
      };
    }

    // Payload do evento de Comprovante de Entrega (110130).
    const ref = nfe.chaveAcesso;
    const url = `${this.focusBaseUrl}/v2/nfe/${ref}/comprovante_entrega`;
    const payload = {
      data_hora_entrega: prova.dataHoraEntrega.toISOString(),
      latitude: prova.latitude,
      longitude: prova.longitude,
      nome_recebedor: prova.recebedorNome,
      documento_recebedor: prova.recebedorDoc || undefined,
      // Hash da imagem da assinatura (a SEFAZ armazena o hash, não a imagem).
      hash_comprovante: this.sha1(prova.assinaturaBase64),
      tipo_comprovante: 'imagem',
    };

    const auth = Buffer.from(`${this.focusToken}:`).toString('base64');

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const raw = (await resp.json().catch(() => ({}))) as FocusNfeResposta;

      if (!resp.ok) {
        this.logger.error(
          `FocusNFe 110130 HTTP ${resp.status} p/ NF-e ${nfe.numero}`,
        );
        return { status: 'erro', raw };
      }
      return {
        status: raw.status || 'processado',
        protocolo: raw.protocolo,
        raw,
      };
    } catch (err) {
      this.logger.error(`Falha de rede FocusNFe 110130: ${String(err)}`);
      return { status: 'erro', raw: { erro: String(err) } };
    }
  }

  /** SHA-1 do conteúdo do comprovante (usa o crypto nativo do Node). */
  private sha1(input: string): string {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createHash } = require('crypto');
    return createHash('sha1').update(input).digest('hex');
  }
}
