import { Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { CurrentTenant } from '../../common/decorators/context.decorator';

@ApiTags('Sync (CD node ↔ nuvem)')
@ApiBearerAuth()
@Controller('sync')
export class SyncController {
  constructor(private service: SyncService) {}

  /** NUVEM: exporta os cadastros crus do tenant (o CD node consome isto). */
  @Get('export')
  @ApiOperation({ summary: 'Exporta cadastros do tenant (tenant/filiais/unidades/clientes/fornecedores/produtos)' })
  export(@CurrentTenant() tenantId: string) {
    return this.service.exportarReferencia(tenantId);
  }

  /** CD NODE: puxa os cadastros do upstream e faz upsert local. */
  @Post('pull')
  @ApiOperation({ summary: 'CD node: puxa e sincroniza os cadastros da nuvem (upstream)' })
  pull() {
    return this.service.pull();
  }

  /** Status: este processo é um CD node? */
  @Get('status')
  @ApiOperation({ summary: 'Indica se este processo é um CD node (tem upstream)' })
  status() {
    return { cdNode: this.service.ehCdNode(), upstream: process.env.UPSTREAM_URL || null };
  }
}
