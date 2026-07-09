import { Controller, Get, Post, Put, Delete, Query, Param, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProdutosService } from './produtos.service';
import { CreateProdutoDto, UpdateProdutoDto } from './dto/produto.dto';
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

  @Get('unidades')
  @ApiOperation({ summary: 'Lista as unidades de medida cadastradas' })
  unidades(@CurrentTenant() tenantId: string) {
    return this.service.listarUnidades(tenantId);
  }

  @Get('categorias')
  @ApiOperation({ summary: 'Categorias existentes em produtos ativos (para filtros)' })
  categorias(@CurrentTenant() tenantId: string) {
    return this.service.listarCategorias(tenantId);
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

  @Post()
  @ApiOperation({ summary: 'Cadastra um novo produto (FLV)' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateProdutoDto) {
    return this.service.create(tenantId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Editar produto (peso unitário, preço, etc.)' })
  update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateProdutoDto) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Inativa um produto' })
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
