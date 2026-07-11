import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { TransportadorasService } from './transportadoras.service';
import { CurrentTenant, Modulo, AuditEntidade } from '../../common/decorators/context.decorator';
import { CreateTransportadoraDto, UpdateTransportadoraDto } from './dto/transportadora.dto';

@ApiTags('Transportadoras')
@ApiBearerAuth()
@Modulo('CADASTROS')
@AuditEntidade('Transportadora', 'transportadora')
@Controller('transportadoras')
export class TransportadorasController {
  constructor(private service: TransportadorasService) {}

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateTransportadoraDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query('search') search?: string, @Query('regiao') regiao?: string) {
    return this.service.findAll(tenantId, search, regiao);
  }

  @Get(':id')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Put(':id')
  update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateTransportadoraDto) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove transportadora' })
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
