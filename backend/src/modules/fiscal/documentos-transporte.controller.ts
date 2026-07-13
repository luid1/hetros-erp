import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DocumentosTransporteService } from './documentos-transporte.service';
import { CurrentTenant, CurrentUser } from '../../common/decorators/context.decorator';

interface ReqUser {
  id: string;
  nome?: string;
}

@ApiTags('Documentos de Transporte (MDF-e/CT-e)')
@ApiBearerAuth()
@Controller('documentos-transporte')
export class DocumentosTransporteController {
  constructor(private service: DocumentosTransporteService) {}

  @Get()
  @ApiOperation({ summary: 'Lista MDF-e/CT-e (simulados) por filial/tipo.' })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('filialId') filialId?: string,
    @Query('tipo') tipo?: string,
  ) {
    return this.service.findAll(tenantId, filialId, tipo);
  }

  @Post()
  @ApiOperation({ summary: 'Cria (simula) um MDF-e ou CT-e persistido para auditoria.' })
  create(@CurrentTenant() tenantId: string, @CurrentUser() user: ReqUser, @Body() dto: any) {
    return this.service.create(tenantId, user?.id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Encerra ou cancela um documento de transporte.' })
  atualizarStatus(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.service.atualizarStatus(tenantId, id, status);
  }
}
