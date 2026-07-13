import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * SYNC — Jeito B / Fase P2 (puxar cadastros da nuvem para o CD node).
 *
 * Dois papéis, mesmo código:
 *  - NUVEM: expõe `exportarReferencia()` (GET /sync/export) com os cadastros crus.
 *  - CD NODE: `pull()` busca do upstream e faz UPSERT por `id` (adota os ids da
 *    nuvem — é uma réplica), respeitando a ordem de FKs.
 *
 * Regra do Jeito B: cadastros são propriedade da NUVEM (nuvem → CD, só leitura no
 * CD). Operações do CD (estoque, CI) sobem na P3.
 */
@Injectable()
export class SyncService implements OnModuleInit {
  private readonly logger = new Logger(SyncService.name);
  private readonly upstream = (process.env.UPSTREAM_URL || '').replace(/\/$/, '');

  constructor(private prisma: PrismaService) {}

  /** Este processo é um CD node (tem upstream configurado)? */
  ehCdNode(): boolean {
    return !!this.upstream;
  }

  /**
   * No CD node: puxa os cadastros da nuvem logo após subir e depois periodicamente.
   * Assim o CD "enxerga tudo" mesmo que a internet caia depois. Na nuvem, não faz nada.
   */
  onModuleInit() {
    if (!this.ehCdNode()) return;
    const intervalo = Number(process.env.SYNC_INTERVAL_MS || 15 * 60 * 1000);
    this.logger.log(`🔌 CD node: sync com upstream ${this.upstream} (a cada ${Math.round(intervalo / 60000)}min).`);
    setTimeout(() => this.pull().catch((e) => this.logger.error(`Sync inicial falhou: ${e?.message}`)), 8000);
    setInterval(() => this.pull().catch((e) => this.logger.warn(`Sync periódico falhou: ${e?.message}`)), intervalo);
  }

  // ── Papel NUVEM: exporta os cadastros crus do tenant ──────────────────────
  async exportarReferencia(tenantId: string) {
    const [tenant, filiais, unidades, clientes, fornecedores, produtos] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
      this.prisma.filial.findMany({ where: { tenantId } }),
      this.prisma.unidadeMedida.findMany({ where: { tenantId } }),
      this.prisma.cliente.findMany({ where: { tenantId } }),
      this.prisma.fornecedor.findMany({ where: { tenantId } }),
      this.prisma.produto.findMany({ where: { tenantId } }),
    ]);
    return {
      geradoEm: new Date().toISOString(),
      tenant, filiais, unidades, clientes, fornecedores, produtos,
    };
  }

  // ── Papel CD NODE: puxa do upstream e faz upsert local ────────────────────
  private async tokenUpstream(): Promise<string> {
    if (process.env.UPSTREAM_TOKEN) return process.env.UPSTREAM_TOKEN;
    const email = process.env.UPSTREAM_EMAIL;
    const password = process.env.UPSTREAM_PASSWORD;
    if (!email || !password) {
      throw new BadRequestException('Configure UPSTREAM_TOKEN, ou UPSTREAM_EMAIL + UPSTREAM_PASSWORD, no CD node.');
    }
    const r = await fetch(`${this.upstream}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) throw new BadRequestException(`Login no upstream falhou (${r.status}).`);
    const d: any = await r.json();
    const token = d.token || d.access_token;
    if (!token) throw new BadRequestException('Upstream não devolveu token.');
    return token;
  }

  /** Remove campos gerenciados pelo banco antes do upsert. */
  private limpar(row: any) {
    const { createdAt, updatedAt, ...resto } = row || {};
    return resto;
  }

  private async upsertLista(model: any, linhas: any[]): Promise<number> {
    let n = 0;
    for (const raw of linhas || []) {
      const dados = this.limpar(raw);
      await model.upsert({ where: { id: dados.id }, create: dados, update: dados });
      n++;
    }
    return n;
  }

  async pull() {
    if (!this.ehCdNode()) {
      throw new BadRequestException('UPSTREAM_URL não configurado — este processo não é um CD node.');
    }
    const token = await this.tokenUpstream();
    const r = await fetch(`${this.upstream}/api/v1/sync/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) throw new BadRequestException(`Falha ao buscar /sync/export (${r.status}).`);
    const dump: any = await r.json();

    const resumo: Record<string, number> = {};
    // Ordem respeita as FKs: tenant → filiais → unidades → clientes/fornecedores → produtos.
    if (dump.tenant) { await this.prisma.tenant.upsert({ where: { id: dump.tenant.id }, create: this.limpar(dump.tenant), update: this.limpar(dump.tenant) }); resumo.tenant = 1; }
    resumo.filiais      = await this.upsertLista(this.prisma.filial, dump.filiais);
    resumo.unidades     = await this.upsertLista(this.prisma.unidadeMedida, dump.unidades);
    resumo.clientes     = await this.upsertLista(this.prisma.cliente, dump.clientes);
    resumo.fornecedores = await this.upsertLista(this.prisma.fornecedor, dump.fornecedores);
    resumo.produtos     = await this.upsertLista(this.prisma.produto, dump.produtos);

    this.logger.log(`⬇️  Sync (pull) do upstream concluído: ${JSON.stringify(resumo)}`);
    return { ok: true, geradoEm: dump.geradoEm, resumo };
  }
}
