import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma, StatusPagamentoMotorista } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ContasPagarService, UsuarioCtx } from '../contas-pagar/contas-pagar.service';
import { CONTA } from '../plano-contas/plano-contas.seed';
import { money, toNumber } from '../../common/utils/money.util';
import {
  CriarPagamentoMotoristaDto,
  AprovarPagamentoMotoristaDto,
} from './dto/pagamento-motorista.dto';

const SYSTEM_CTX: UsuarioCtx = { id: 'SYSTEM', nome: 'Sistema (logística)' };

interface RotaConcluidaPayload {
  tenantId: string;
  routeId: string;
  filialId?: string | null;
  motoristaId?: string | null;
  motoristaNome?: string | null;
  dataRota?: Date | string | null;
}

@Injectable()
export class PagamentosMotoristaService {
  private readonly logger = new Logger(PagamentosMotoristaService.name);

  constructor(
    private prisma: PrismaService,
    private contasPagar: ContasPagarService,
  ) {}

  private serializar(p: any) {
    return { ...p, valor: toNumber(p.valor) };
  }

  // ───────────────────────── Listener (Frente D) ─────────────────────────

  /**
   * Rota concluída → cria um PagamentoMotorista PENDENTE (a diária/frete é
   * definida na aprovação). Idempotente por routeId (@@unique tenant+route).
   */
  @OnEvent('rota.concluida')
  async onRotaConcluida(payload: RotaConcluidaPayload) {
    if (!payload?.routeId) return;
    try {
      const existe = await this.prisma.pagamentoMotorista.findFirst({
        where: { tenantId: payload.tenantId, routeId: payload.routeId },
      });
      if (existe) return;

      const data = payload.dataRota ? new Date(payload.dataRota) : new Date();
      await this.prisma.pagamentoMotorista.create({
        data: {
          tenantId: payload.tenantId,
          filialId: payload.filialId || null,
          routeId: payload.routeId,
          motoristaId: payload.motoristaId || null,
          motoristaNome: payload.motoristaNome || null,
          descricao: `Diária/frete — rota de ${data.toLocaleDateString('pt-BR')}`,
          valor: new Prisma.Decimal(0),
          dataReferencia: data,
          status: StatusPagamentoMotorista.PENDENTE,
          planoContasCodigo: CONTA.FRETE_MOTORISTA,
        },
      });
      this.logger.log(`Pagamento de motorista PENDENTE criado p/ rota ${payload.routeId}.`);
    } catch (e: any) {
      // P2002 = corrida entre duas entregas fechando a rota; ignora duplicata.
      if (e?.code !== 'P2002') {
        this.logger.error('Falha ao criar pagamento de motorista', e as Error);
      }
    }
  }

  // ───────────────────────── CRUD / operações ─────────────────────────

  async listar(tenantId: string, status?: StatusPagamentoMotorista, motoristaId?: string) {
    const rows = await this.prisma.pagamentoMotorista.findMany({
      where: {
        tenantId,
        ...(status ? { status } : {}),
        ...(motoristaId ? { motoristaId } : {}),
      },
      orderBy: [{ status: 'asc' }, { dataReferencia: 'desc' }],
      take: 500,
    });
    return rows.map((p) => this.serializar(p));
  }

  async findOne(tenantId: string, id: string) {
    const p = await this.prisma.pagamentoMotorista.findFirst({ where: { id, tenantId } });
    if (!p) throw new NotFoundException('Pagamento não encontrado.');
    return this.serializar(p);
  }

  async criar(tenantId: string, dto: CriarPagamentoMotoristaDto) {
    if (!dto.descricao?.trim()) throw new BadRequestException('Informe a descrição.');
    const p = await this.prisma.pagamentoMotorista.create({
      data: {
        tenantId,
        filialId: dto.filialId || null,
        routeId: dto.routeId || null,
        motoristaId: dto.motoristaId || null,
        motoristaNome: dto.motoristaNome || null,
        funcionarioId: dto.funcionarioId || null,
        fornecedorId: dto.fornecedorId || null,
        descricao: dto.descricao.trim(),
        valor: new Prisma.Decimal(money(dto.valor ?? 0)),
        dataReferencia: new Date(dto.dataReferencia),
        status: StatusPagamentoMotorista.PENDENTE,
        planoContasCodigo: CONTA.FRETE_MOTORISTA,
      },
    });
    return this.serializar(p);
  }

  async atualizarValor(tenantId: string, id: string, valor: number) {
    const p = await this.findOne(tenantId, id);
    if (p.status !== StatusPagamentoMotorista.PENDENTE)
      throw new BadRequestException('Só é possível ajustar pagamentos pendentes.');
    const upd = await this.prisma.pagamentoMotorista.update({
      where: { id },
      data: { valor: new Prisma.Decimal(money(valor)) },
    });
    return this.serializar(upd);
  }

  /**
   * Aprova o pagamento → gera Conta a Pagar (FRETE_MOTORISTA) e marca A_PAGAR.
   * Idempotente: recusa se não estiver PENDENTE.
   */
  async aprovar(
    tenantId: string,
    usuario: UsuarioCtx,
    id: string,
    dto: AprovarPagamentoMotoristaDto = {},
  ) {
    const p = await this.prisma.pagamentoMotorista.findFirst({ where: { id, tenantId } });
    if (!p) throw new NotFoundException('Pagamento não encontrado.');
    if (p.status !== StatusPagamentoMotorista.PENDENTE)
      throw new BadRequestException('Pagamento já processado.');

    const valor = money(dto.valor ?? toNumber(p.valor));
    if (valor <= 0) throw new BadRequestException('Informe um valor maior que zero.');

    const fornecedorId = dto.fornecedorId || p.fornecedorId || undefined;
    const vencimento = dto.dataVencimento ? new Date(dto.dataVencimento) : new Date();

    const contas = await this.contasPagar.create(tenantId, usuario, {
      fornecedorId,
      filialId: p.filialId || undefined,
      descricao: p.descricao,
      valorTotal: valor,
      dataVencimento: vencimento.toISOString(),
      planoContasCodigo: p.planoContasCodigo || CONTA.FRETE_MOTORISTA,
      observacoes: `PAG_MOTORISTA=${p.id}${p.routeId ? ` ROTA=${p.routeId}` : ''}`,
    });

    const upd = await this.prisma.pagamentoMotorista.update({
      where: { id },
      data: {
        valor: new Prisma.Decimal(valor),
        status: StatusPagamentoMotorista.A_PAGAR,
        contaPagarId: contas?.[0]?.id || null,
        fornecedorId: fornecedorId || null,
      },
    });
    return this.serializar(upd);
  }

  /**
   * Cancela o pagamento; se já gerou Conta a Pagar, cancela-a (estornando o DRE).
   */
  async cancelar(tenantId: string, usuario: UsuarioCtx, id: string, motivo?: string) {
    const p = await this.prisma.pagamentoMotorista.findFirst({ where: { id, tenantId } });
    if (!p) throw new NotFoundException('Pagamento não encontrado.');
    if (p.status === StatusPagamentoMotorista.CANCELADO)
      throw new BadRequestException('Pagamento já cancelado.');

    if (p.contaPagarId) {
      try {
        await this.contasPagar.cancelar(tenantId, usuario, p.contaPagarId, motivo || 'Pagamento de motorista cancelado.');
      } catch {
        // conta já paga/cancelada — segue cancelando o pagamento
      }
    }

    const upd = await this.prisma.pagamentoMotorista.update({
      where: { id },
      data: { status: StatusPagamentoMotorista.CANCELADO, contaPagarId: null },
    });
    return this.serializar(upd);
  }

  /**
   * Varredura de segurança: cria pagamentos PENDENTES para rotas já concluídas
   * (COMPLETED) que ainda não têm pagamento — cobre rotas fechadas antes do
   * listener existir. Idempotente por routeId.
   */
  async sincronizar(tenantId: string) {
    const rotas = await this.prisma.route.findMany({
      where: { tenantId, status: 'COMPLETED' },
      select: { id: true, filialId: true, motoristaId: true, motoristaNome: true, dataRota: true },
      take: 1000,
    });
    let criados = 0;
    for (const r of rotas) {
      const existe = await this.prisma.pagamentoMotorista.findFirst({
        where: { tenantId, routeId: r.id },
      });
      if (existe) continue;
      try {
        await this.prisma.pagamentoMotorista.create({
          data: {
            tenantId,
            filialId: r.filialId || null,
            routeId: r.id,
            motoristaId: r.motoristaId || null,
            motoristaNome: r.motoristaNome || null,
            descricao: `Diária/frete — rota de ${new Date(r.dataRota).toLocaleDateString('pt-BR')}`,
            valor: new Prisma.Decimal(0),
            dataReferencia: r.dataRota,
            status: StatusPagamentoMotorista.PENDENTE,
            planoContasCodigo: CONTA.FRETE_MOTORISTA,
          },
        });
        criados += 1;
      } catch (e: any) {
        if (e?.code !== 'P2002') throw e;
      }
    }
    return { criados };
  }
}
