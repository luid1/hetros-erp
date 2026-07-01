import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ComprasService } from './compras.service';
import { CurrentTenant, CurrentUser, Modulo } from '../../common/decorators/context.decorator';

@ApiTags('Compras')
@ApiBearerAuth()
@Modulo('ESTOQUE')
@Controller('compras')
export class ComprasController {
  constructor(private service: ComprasService) {}

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('fornecedorId') fornecedorId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(tenantId, { status, fornecedorId, search });
  }

  @Get(':id')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Cria uma Ordem de Compra' })
  create(@CurrentTenant() tenantId: string, @Body() dto: any) {
    return this.service.create(tenantId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Edita uma OC (recalcula totais)' })
  update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Muda o status da OC (ENTREGUE dá entrada no estoque + contas a pagar)' })
  mudarStatus(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body('status') status: any) {
    return this.service.mudarStatus(tenantId, id, status, user.id);
  }

  @Post(':id/receber')
  @ApiOperation({ summary: 'Recebe a OC: entrada no estoque + contas a pagar + marca ENTREGUE' })
  receber(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Param('id') id: string) {
    return this.service.receber(tenantId, id, user.id);
  }
}
