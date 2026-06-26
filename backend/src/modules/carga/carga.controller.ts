import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CargaService } from './carga.service';
import { CurrentTenant, Modulo } from '../../common/decorators/context.decorator';

@ApiTags('Controle de Carga')
@ApiBearerAuth()
@Modulo('PEDIDOS')
@Controller('carga')
export class CargaController {
  constructor(private service: CargaService) {}

  @Get(':filialId/grade')
  @ApiOperation({ summary: 'Grade de pedidos do dia para Controle de Carga' })
  grade(
    @CurrentTenant() tenantId: string,
    @Param('filialId') filialId: string,
    @Query('data') data: string,
    @Query('segmento') segmento?: string,
    @Query('somentePendentes') somentePendentes?: string,
    @Query('somenteEscolas') somenteEscolas?: string,
    @Query('mostrarFinalizados') mostrarFinalizados?: string,
  ) {
    return this.service.getGrade(tenantId, filialId, data || new Date().toISOString().split('T')[0], {
      segmento,
      somentePendentes: somentePendentes === 'true',
      somenteEscolas: somenteEscolas === 'true',
      mostrarFinalizados: mostrarFinalizados === 'true',
    });
  }

  @Get(':filialId/rotas')
  @ApiOperation({ summary: 'Rotas e motoristas do dia' })
  rotas(
    @CurrentTenant() tenantId: string,
    @Param('filialId') filialId: string,
    @Query('data') data: string,
  ) {
    return this.service.getRotas(tenantId, filialId, data || new Date().toISOString().split('T')[0]);
  }

  @Get(':filialId/totais')
  totais(
    @CurrentTenant() tenantId: string,
    @Param('filialId') filialId: string,
    @Query('data') data: string,
  ) {
    return this.service.getTotais(tenantId, filialId, data || new Date().toISOString().split('T')[0]);
  }

  @Post('autorizar')
  @ApiOperation({ summary: 'Autoriza carga dos pedidos selecionados' })
  autorizar(@CurrentTenant() tenantId: string, @Body() body: { pedidoIds: string[] }) {
    return this.service.autorizarCarga(tenantId, body.pedidoIds);
  }

  @Post('rotear')
  @ApiOperation({ summary: 'Associa pedidos a romaneio/motorista' })
  rotear(@CurrentTenant() tenantId: string, @Body() body: { pedidoIds: string[]; romaneioId: string }) {
    return this.service.rotear(tenantId, body.pedidoIds, body.romaneioId);
  }
}
