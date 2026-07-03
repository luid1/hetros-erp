import { Controller, Get, Param, Query, Patch, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { RomaneiosService } from './romaneios.service';
import { CurrentTenant, Modulo } from '../../common/decorators/context.decorator';

@ApiTags('Romaneios')
@ApiBearerAuth()
@Modulo('LOGISTICA')
@Controller('romaneios')
export class RomaneiosController {
  constructor(private service: RomaneiosService) {}

  @Get()
  @ApiOperation({ summary: 'Lista os romaneios (viagens) com filtros' })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('filialId') filialId?: string,
    @Query('status') status?: string,
    @Query('dataIni') dataIni?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    return this.service.findAll(tenantId, { filialId, status, dataIni, dataFim });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do romaneio com os pedidos por sequência de entrega' })
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Muda o status da viagem (montagem/trânsito/concluído)' })
  mudarStatus(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body('status') status: string) {
    return this.service.mudarStatus(tenantId, id, status);
  }

  @Patch('item/:itemId/entrega')
  @ApiOperation({ summary: 'Marca/desmarca uma entrega como concluída' })
  marcarEntrega(@CurrentTenant() tenantId: string, @Param('itemId') itemId: string, @Body('entregue') entregue: boolean) {
    return this.service.marcarEntrega(tenantId, itemId, entregue);
  }
}
