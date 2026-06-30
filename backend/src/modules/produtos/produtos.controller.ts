import { Controller, Get, Put, Query, Param, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProdutosService } from './produtos.service';
import { CurrentTenant, Modulo } from '../../common/decorators/context.decorator';

@ApiTags('Produtos')
@ApiBearerAuth()
@Modulo('CADASTROS')
@Controller('produtos')
export class ProdutosController {
  constructor(private service: ProdutosService) {}

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query('q') q?: string) {
    return this.service.findAll(tenantId, q);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Editar produto (peso unitário, preço, etc.)' })
  update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(tenantId, id, dto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Busca de produtos (autocomplete) com saldo disponível' })
  search(
    @CurrentTenant() tenantId: string,
    @Query('q') q: string,
    @Query('filialId') filialId?: string,
  ) {
    return this.service.search(tenantId, q || '', filialId);
  }
}
