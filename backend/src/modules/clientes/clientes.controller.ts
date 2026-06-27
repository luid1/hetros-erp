import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClientesService } from './clientes.service';
import { CurrentTenant, Modulo } from '../../common/decorators/context.decorator';

@ApiTags('Clientes')
@ApiBearerAuth()
@Modulo('CADASTROS')
@Controller('clientes')
export class ClientesController {
  constructor(private service: ClientesService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar cliente' })
  create(@CurrentTenant() tenantId: string, @Body() dto: any) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar clientes' })
  findAll(@CurrentTenant() tenantId: string, @Query('search') search?: string) {
    return this.service.findAll(tenantId, search);
  }

  @Get(':id')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Put(':id')
  update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
