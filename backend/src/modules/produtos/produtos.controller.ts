import { Controller, Get, Query } from '@nestjs/common';
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
  findAll(@CurrentTenant() tenantId: string) {
    return this.service.findAll(tenantId);
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
