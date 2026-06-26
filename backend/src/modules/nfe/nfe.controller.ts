import { Controller, Get, Post, Body, Param, Query, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { NFeService } from './nfe.service';
import { CurrentTenant, CurrentUser, Modulo } from '../../common/decorators/context.decorator';

@ApiTags('NF-e')
@ApiBearerAuth()
@Modulo('NFE')
@Controller('nfe')
export class NFeController {
  constructor(private service: NFeService) {}

  @Get(':filialId')
  @ApiOperation({ summary: 'Lista NF-e da filial com filtros' })
  findAll(
    @CurrentTenant() tenantId: string,
    @Param('filialId') filialId: string,
    @Query('status') status?: any,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    return this.service.findAll(tenantId, filialId, {
      status,
      dataInicio: dataInicio ? new Date(dataInicio) : undefined,
      dataFim: dataFim ? new Date(dataFim) : undefined,
    });
  }

  @Get('documento/:id')
  @ApiOperation({ summary: 'Detalhe de uma NF-e com itens' })
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post('gerar-de-pedido/:pedidoId')
  @ApiOperation({ summary: 'Gera NF-e rascunho a partir de um pedido faturável' })
  gerarDePedido(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('pedidoId') pedidoId: string,
    @Body('filialId') filialId: string,
  ) {
    return this.service.gerarDesPedido(tenantId, pedidoId, filialId, user.id);
  }

  @Post(':id/emitir')
  @ApiOperation({ summary: 'Envia NF-e ao SEFAZ → baixa estoque + gera conta a receber automaticamente' })
  emitir(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Param('id') id: string) {
    return this.service.emitir(tenantId, id, user.id);
  }

  @Patch(':id/cancelar')
  @ApiOperation({ summary: 'Cancela NF-e no SEFAZ' })
  cancelar(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body('motivo') motivo: string,
  ) {
    return this.service.cancelar(tenantId, id, motivo);
  }
}
