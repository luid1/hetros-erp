import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, StatusFolha, TipoItemFolha, StatusFuncionario } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ContasPagarService, UsuarioCtx } from '../contas-pagar/contas-pagar.service';
import { CONTA } from '../plano-contas/plano-contas.seed';
import { money, sumMoney, subMoney, toNumber } from '../../common/utils/money.util';
import {
  CriarFolhaDto,
  AtualizarFolhaDto,
  ItemFolhaDto,
  FecharFolhaDto,
} from './dto/folha.dto';

@Injectable()
export class FolhaService {
  constructor(
    private prisma: PrismaService,
    private contasPagar: ContasPagarService,
  ) {}

  // ───────────────────────── Serialização ─────────────────────────

  private serializar(f: any) {
    return {
      ...f,
      totalProventos: toNumber(f.totalProventos),
      totalDescontos: toNumber(f.totalDescontos),
      totalLiquido: toNumber(f.totalLiquido),
      itens: (f.itens || []).map((it: any) => ({
        ...it,
        valor: toNumber(it.valor),
        funcionarioNome: it.funcionario?.nome,
      })),
    };
  }

  // ───────────────────────── CRUD folha ─────────────────────────

  async listar(tenantId: string, status?: StatusFolha) {
    const rows = await this.prisma.folha.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      orderBy: { competencia: 'desc' },
    });
    return rows.map((f) => ({
      ...f,
      totalProventos: toNumber(f.totalProventos),
      totalDescontos: toNumber(f.totalDescontos),
      totalLiquido: toNumber(f.totalLiquido),
    }));
  }

  async findOne(tenantId: string, id: string) {
    const f = await this.prisma.folha.findFirst({
      where: { id, tenantId },
      include: {
        itens: { include: { funcionario: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!f) throw new NotFoundException('Folha não encontrada.');
    return this.serializar(f);
  }

  async criar(tenantId: string, dto: CriarFolhaDto) {
    const existe = await this.prisma.folha.findFirst({
      where: { tenantId, competencia: dto.competencia },
    });
    if (existe) throw new ConflictException(`Já existe folha para a competência ${dto.competencia}.`);

    const f = await this.prisma.folha.create({
      data: {
        tenantId,
        filialId: dto.filialId || null,
        competencia: dto.competencia,
        descricao: dto.descricao || `Folha ${dto.competencia}`,
        dataPagamento: dto.dataPagamento ? new Date(dto.dataPagamento) : null,
        observacoes: dto.observacoes || null,
        status: StatusFolha.ABERTA,
      },
    });
    return this.findOne(tenantId, f.id);
  }

  async atualizar(tenantId: string, id: string, dto: AtualizarFolhaDto) {
    const f = await this.findOne(tenantId, id);
    if (f.status !== StatusFolha.ABERTA)
      throw new BadRequestException('Só é possível editar folhas abertas.');
    await this.prisma.folha.update({
      where: { id },
      data: {
        descricao: dto.descricao ?? undefined,
        dataPagamento:
          dto.dataPagamento !== undefined
            ? dto.dataPagamento
              ? new Date(dto.dataPagamento)
              : null
            : undefined,
        observacoes: dto.observacoes ?? undefined,
      },
    });
    return this.findOne(tenantId, id);
  }

  async remover(tenantId: string, id: string) {
    const f = await this.findOne(tenantId, id);
    if (f.status === StatusFolha.FECHADA)
      throw new BadRequestException('Reabra a folha antes de excluí-la (há contas a pagar geradas).');
    await this.prisma.folha.delete({ where: { id } }); // itens caem por cascade
    return { ok: true };
  }

  // ───────────────────────── Itens ─────────────────────────

  private async assertAberta(tenantId: string, folhaId: string) {
    const f = await this.prisma.folha.findFirst({ where: { id: folhaId, tenantId } });
    if (!f) throw new NotFoundException('Folha não encontrada.');
    if (f.status !== StatusFolha.ABERTA)
      throw new BadRequestException('Folha não está aberta para edição.');
    return f;
  }

  async adicionarItem(tenantId: string, folhaId: string, dto: ItemFolhaDto) {
    await this.assertAberta(tenantId, folhaId);
    const func = await this.prisma.funcionario.findFirst({
      where: { id: dto.funcionarioId, tenantId },
    });
    if (!func) throw new NotFoundException('Funcionário não encontrado.');

    await this.prisma.itemFolha.create({
      data: {
        tenantId,
        folhaId,
        funcionarioId: dto.funcionarioId,
        descricao: dto.descricao.trim(),
        tipo: dto.tipo || TipoItemFolha.PROVENTO,
        valor: new Prisma.Decimal(money(dto.valor)),
      },
    });
    await this.recalcular(tenantId, folhaId);
    return this.findOne(tenantId, folhaId);
  }

  async removerItem(tenantId: string, folhaId: string, itemId: string) {
    await this.assertAberta(tenantId, folhaId);
    const item = await this.prisma.itemFolha.findFirst({
      where: { id: itemId, tenantId, folhaId },
    });
    if (!item) throw new NotFoundException('Item não encontrado.');
    await this.prisma.itemFolha.delete({ where: { id: itemId } });
    await this.recalcular(tenantId, folhaId);
    return this.findOne(tenantId, folhaId);
  }

  /**
   * Popula a folha com um provento "Salário" para cada funcionário ATIVO com
   * salarioBase > 0 que ainda não está na folha. Idempotente por funcionário+descrição.
   */
  async gerarPadrao(tenantId: string, folhaId: string) {
    await this.assertAberta(tenantId, folhaId);
    const funcionarios = await this.prisma.funcionario.findMany({
      where: { tenantId, status: StatusFuncionario.ATIVO },
    });
    const existentes = await this.prisma.itemFolha.findMany({
      where: { tenantId, folhaId, descricao: 'Salário' },
      select: { funcionarioId: true },
    });
    const jaTem = new Set(existentes.map((e) => e.funcionarioId));

    const novos = funcionarios
      .filter((f) => toNumber(f.salarioBase) > 0 && !jaTem.has(f.id))
      .map((f) => ({
        tenantId,
        folhaId,
        funcionarioId: f.id,
        descricao: 'Salário',
        tipo: TipoItemFolha.PROVENTO,
        valor: new Prisma.Decimal(money(toNumber(f.salarioBase))),
      }));

    if (novos.length) await this.prisma.itemFolha.createMany({ data: novos });
    await this.recalcular(tenantId, folhaId);
    return this.findOne(tenantId, folhaId);
  }

  private async recalcular(tenantId: string, folhaId: string) {
    const itens = await this.prisma.itemFolha.findMany({ where: { tenantId, folhaId } });
    const proventos = sumMoney(
      itens.filter((i) => i.tipo === TipoItemFolha.PROVENTO).map((i) => i.valor),
    );
    const descontos = sumMoney(
      itens.filter((i) => i.tipo === TipoItemFolha.DESCONTO).map((i) => i.valor),
    );
    await this.prisma.folha.update({
      where: { id: folhaId },
      data: {
        totalProventos: new Prisma.Decimal(proventos),
        totalDescontos: new Prisma.Decimal(descontos),
        totalLiquido: new Prisma.Decimal(subMoney(proventos, descontos)),
      },
    });
  }

  // ───────────────────────── Fechamento / reabertura ─────────────────────────

  /**
   * Fecha a folha: gera uma Conta a Pagar (líquido) por funcionário, categorizada
   * em SALARIOS, e marca a folha como FECHADA. Idempotente: recusa se já fechada.
   */
  async fechar(tenantId: string, usuario: UsuarioCtx, folhaId: string, dto: FecharFolhaDto = {}) {
    const folha = await this.prisma.folha.findFirst({
      where: { id: folhaId, tenantId },
      include: { itens: { include: { funcionario: true } } },
    });
    if (!folha) throw new NotFoundException('Folha não encontrada.');
    if (folha.status === StatusFolha.FECHADA)
      throw new BadRequestException('Folha já está fechada.');
    if (folha.itens.length === 0)
      throw new BadRequestException('Adicione itens antes de fechar a folha.');

    const vencimento = dto.dataPagamento
      ? new Date(dto.dataPagamento)
      : folha.dataPagamento || new Date();

    // Agrupa por funcionário → líquido.
    const porFunc = new Map<string, { nome: string; proventos: number; descontos: number }>();
    for (const it of folha.itens) {
      const cur = porFunc.get(it.funcionarioId) || {
        nome: it.funcionario?.nome || 'Funcionário',
        proventos: 0,
        descontos: 0,
      };
      if (it.tipo === TipoItemFolha.PROVENTO) cur.proventos = sumMoney([cur.proventos, it.valor]);
      else cur.descontos = sumMoney([cur.descontos, it.valor]);
      porFunc.set(it.funcionarioId, cur);
    }

    for (const [funcionarioId, dados] of porFunc) {
      const liquido = subMoney(dados.proventos, dados.descontos);
      if (liquido <= 0) continue; // sem líquido a pagar

      const contas = await this.contasPagar.create(tenantId, usuario, {
        filialId: folha.filialId || undefined,
        descricao: `Folha ${folha.competencia} — ${dados.nome}`,
        valorTotal: liquido,
        dataVencimento: vencimento.toISOString(),
        planoContasCodigo: CONTA.SALARIOS,
        observacoes: `FOLHA=${folha.id} FUNC=${funcionarioId}`,
      });
      const contaPagarId = contas?.[0]?.id;
      // Marca os itens do funcionário com a conta gerada (trilha p/ estorno).
      await this.prisma.itemFolha.updateMany({
        where: { folhaId, funcionarioId },
        data: { contaPagarId: contaPagarId || null },
      });
    }

    await this.prisma.folha.update({
      where: { id: folhaId },
      data: {
        status: StatusFolha.FECHADA,
        fechadaEm: new Date(),
        fechadaPor: usuario.nome || usuario.id,
        dataPagamento: vencimento,
      },
    });
    return this.findOne(tenantId, folhaId);
  }

  /**
   * Reabre a folha: cancela todas as Contas a Pagar geradas (estornando o DRE) e
   * volta o status para ABERTA. Idempotente.
   */
  async reabrir(tenantId: string, usuario: UsuarioCtx, folhaId: string) {
    const folha = await this.prisma.folha.findFirst({
      where: { id: folhaId, tenantId },
      include: { itens: true },
    });
    if (!folha) throw new NotFoundException('Folha não encontrada.');
    if (folha.status !== StatusFolha.FECHADA)
      throw new BadRequestException('Só é possível reabrir folhas fechadas.');

    const contaIds = Array.from(
      new Set(folha.itens.map((i) => i.contaPagarId).filter((v): v is string => !!v)),
    );
    for (const contaId of contaIds) {
      try {
        await this.contasPagar.cancelar(tenantId, usuario, contaId, `Reabertura da folha ${folha.competencia}.`);
      } catch {
        // conta já paga/cancelada — segue reabrindo as demais
      }
    }

    await this.prisma.itemFolha.updateMany({ where: { folhaId }, data: { contaPagarId: null } });
    await this.prisma.folha.update({
      where: { id: folhaId },
      data: { status: StatusFolha.ABERTA, fechadaEm: null, fechadaPor: null },
    });
    return this.findOne(tenantId, folhaId);
  }
}
