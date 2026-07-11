import { Controller, Get, Post, Put, Delete, Query, Param, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { VeiculosService } from './veiculos.service';
import { CurrentTenant, Modulo } from '../../common/decorators/context.decorator';
import { CreateVeiculoDto, UpdateVeiculoDto } from './dto/veiculo.dto';

@ApiTags('Frotas & Veículos')
@ApiBearerAuth()
@Modulo('LOGISTICA')
@Controller('veiculos')
export class VeiculosController {
  constructor(private service: VeiculosService) {}

  @Get()
  @ApiOperation({ summary: 'Lista os veículos da frota' })
  findAll(@CurrentTenant() tenantId: string, @Query('q') q?: string) {
    return this.service.findAll(tenantId, q);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra um veículo' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateVeiculoDto) {
    return this.service.create(tenantId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Edita um veículo' })
  update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateVeiculoDto) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Inativa um veículo' })
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
