import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { VendedoresService } from './vendedores.service';
import { CriarVendedorDto, AtualizarVendedorDto } from './dto/vendedor.dto';
import { CurrentTenant } from '../../common/decorators/context.decorator';
import { PermissoesGuard } from '../../common/guards/permissoes.guard';
import { RequirePermissao } from '../../common/decorators/permissoes.decorator';

@ApiTags('Vendedores')
@ApiBearerAuth()
@Controller('vendedores')
export class VendedoresController {
  constructor(private service: VendedoresService) {}

  @Get()
  @ApiOperation({ summary: 'Lista os vendedores (ativos por padrão).' })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('incluirInativos') incluirInativos?: string,
  ) {
    return this.service.findAll(tenantId, incluirInativos === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um vendedor.' })
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @UseGuards(PermissoesGuard)
  @RequirePermissao('FINANCEIRO:CONFIGURAR')
  @ApiOperation({ summary: 'Cria um vendedor. Requer FINANCEIRO:CONFIGURAR.' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CriarVendedorDto) {
    return this.service.create(tenantId, dto);
  }

  @Patch(':id')
  @UseGuards(PermissoesGuard)
  @RequirePermissao('FINANCEIRO:CONFIGURAR')
  @ApiOperation({ summary: 'Edita um vendedor. Requer FINANCEIRO:CONFIGURAR.' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AtualizarVendedorDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  @UseGuards(PermissoesGuard)
  @RequirePermissao('FINANCEIRO:CONFIGURAR')
  @ApiOperation({ summary: 'Inativa um vendedor. Requer FINANCEIRO:CONFIGURAR.' })
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
