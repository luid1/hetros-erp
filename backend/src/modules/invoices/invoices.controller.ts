import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  InvoicesService,
  ListarInvoiceDto,
  GerarInvoiceDto,
} from './invoices.service';
import { CurrentTenant, CurrentUser } from '../../common/decorators/context.decorator';
import { PermissoesGuard } from '../../common/guards/permissoes.guard';
import { RequirePermissao } from '../../common/decorators/permissoes.decorator';

/** Contexto mínimo do usuário autenticado (montado no JwtStrategy). */
interface ReqUser {
  id: string;
  nome?: string;
}

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private service: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista notas fiscais (com filtros de status/período).' })
  findAll(@CurrentTenant() tenantId: string, @Query() filtros: ListarInvoiceDto) {
    return this.service.findAll(tenantId, filtros);
  }

  @Get('resumo')
  @ApiOperation({ summary: 'KPIs consolidados de notas fiscais.' })
  resumo(@CurrentTenant() tenantId: string, @Query() filtros: ListarInvoiceDto) {
    return this.service.resumo(tenantId, filtros);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma nota, seus impostos e trilha de auditoria.' })
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Gera uma nota fiscal (DRAFT) a partir de um pedido.' })
  gerar(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: ReqUser,
    @Body() dto: GerarInvoiceDto,
  ) {
    return this.service.gerar(tenantId, { id: user.id, nome: user.nome }, dto);
  }

  @Patch(':id/transmitir')
  @UseGuards(PermissoesGuard)
  @RequirePermissao('FISCAL:OPERAR')
  @ApiOperation({ summary: 'Transmite/autoriza a nota na SEFAZ. Requer FISCAL:OPERAR.' })
  transmitir(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: ReqUser,
    @Param('id') id: string,
  ) {
    return this.service.transmitir(tenantId, { id: user.id, nome: user.nome }, id);
  }

  @Patch(':id/erro')
  @UseGuards(PermissoesGuard)
  @RequirePermissao('FISCAL:OPERAR')
  @ApiOperation({ summary: 'Marca a nota como rejeitada (ERRONEOUS). Requer FISCAL:OPERAR.' })
  marcarErro(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: ReqUser,
    @Param('id') id: string,
    @Body() body: { motivo?: string },
  ) {
    return this.service.marcarErro(tenantId, { id: user.id, nome: user.nome }, id, body?.motivo);
  }

  @Patch(':id/cancelar')
  @UseGuards(PermissoesGuard)
  @RequirePermissao('FISCAL:OPERAR')
  @ApiOperation({ summary: 'Cancela uma nota emitida. Requer FISCAL:OPERAR.' })
  cancelar(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: ReqUser,
    @Param('id') id: string,
    @Body() body: { motivo?: string },
  ) {
    return this.service.cancelar(tenantId, { id: user.id, nome: user.nome }, id, body?.motivo);
  }
}
