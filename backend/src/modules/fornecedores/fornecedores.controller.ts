import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { FornecedoresService } from './fornecedores.service';
import { CurrentTenant } from '../../common/decorators/context.decorator';

@ApiTags('Fornecedores')
@ApiBearerAuth()
@Controller('fornecedores')
export class FornecedoresController {
  constructor(private service: FornecedoresService) {}

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: any) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query('search') search?: string, @Query('tipoParceria') tipoParceria?: string) {
    return this.service.findAll(tenantId, search, tipoParceria);
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
  @ApiOperation({ summary: 'Remove fornecedor' })
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
