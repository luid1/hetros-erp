import { Controller, Get, Post, Put, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { PedidosService } from './pedidos.service';
import { CurrentTenant, CurrentUser, Modulo } from '../../common/decorators/context.decorator';

@ApiTags('Pedidos')
@ApiBearerAuth()
@Modulo('PEDIDOS')
@Controller('pedidos')
export class PedidosController {
  constructor(private service: PedidosService) {}

  @Post()
  @ApiOperation({ summary: 'Criar pedido de venda' })
  create(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() dto: any) {
    return this.service.create(tenantId, { ...dto, usuarioId: user.id });
  }

  @Get()
  @ApiOperation({ summary: 'Listar pedidos com filtros' })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('filialId') filialId?: string,
    @Query('status') status?: string,
    @Query('clienteId') clienteId?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(tenantId, { filialId, status, clienteId, dataInicio, dataFim, search });
  }

  @Get(':id')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Editar pedido (rascunho)' })
  update(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(tenantId, id, { ...dto, usuarioId: user.id });
  }

  @Patch(':id/confirmar')
  @ApiOperation({ summary: 'Confirmar pedido' })
  confirmar(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.confirmar(tenantId, id);
  }

  @Patch(':id/cancelar')
  @ApiOperation({ summary: 'Cancelar pedido' })
  cancelar(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.cancelar(tenantId, id);
  }

  @Patch(':id/status')
  updateStatus(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body('status') status: string) {
    return this.service.updateStatus(tenantId, id, status);
  }

  @Patch(':id/itens/:itemId/separacao')
  @ApiOperation({ summary: 'Separação/pesagem de um item (peso aferido, conferência, corte)' })
  separarItem(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: { pesoAferido?: number; quantidadeSeparada?: number; separado?: boolean; cortado?: boolean },
  ) {
    return this.service.separarItem(tenantId, id, itemId, dto);
  }
}
