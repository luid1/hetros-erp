import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ComissoesService } from './comissoes.service';
import { FecharComissaoDto } from './dto/comissao.dto';
import { CurrentTenant, CurrentUser } from '../../common/decorators/context.decorator';
import { PermissoesGuard } from '../../common/guards/permissoes.guard';
import { RequirePermissao } from '../../common/decorators/permissoes.decorator';

@ApiTags('Comissoes')
@ApiBearerAuth()
@Controller('comissoes')
export class ComissoesController {
  constructor(private service: ComissoesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista as comissões (filtros: status, vendedorId, período).' })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('vendedorId') vendedorId?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    return this.service.findAll(tenantId, { status, vendedorId, dataInicio, dataFim });
  }

  @Get('resumo')
  @ApiOperation({ summary: 'Totais por status (pendente/fechada/cancelada).' })
  resumo(@CurrentTenant() tenantId: string) {
    return this.service.resumo(tenantId);
  }

  @Post('fechar')
  @UseGuards(PermissoesGuard)
  @RequirePermissao('FINANCEIRO:OPERAR')
  @ApiOperation({ summary: 'Fecha as comissões pendentes em título(s) a pagar. Requer FINANCEIRO:OPERAR.' })
  fechar(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: FecharComissaoDto,
  ) {
    return this.service.fechar(tenantId, { id: user.id, nome: user.nome }, dto);
  }
}
