import { Controller, Get, Post, Patch, Delete, Body, Query, Param } from '@nestjs/common';
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

  @Post('romaneio')
  @ApiOperation({ summary: 'Cria uma rota (Romaneio) com motorista/veículo e os pedidos selecionados' })
  criarRomaneio(@CurrentTenant() tenantId: string, @Body() body: any) {
    return this.service.criarRomaneio(tenantId, body);
  }

  @Get(':filialId/fechamento-frete')
  @ApiOperation({ summary: 'Fechamento de frete por motorista/rota do dia' })
  fechamentoFrete(
    @CurrentTenant() tenantId: string,
    @Param('filialId') filialId: string,
    @Query('data') data: string,
  ) {
    return this.service.getFechamentoFrete(tenantId, filialId, data || new Date().toISOString().split('T')[0]);
  }

  @Patch('romaneio/:id/frete')
  @ApiOperation({ summary: 'Lança o valor do frete de uma rota' })
  setFrete(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() body: { valorFrete: number }) {
    return this.service.setFrete(tenantId, id, body.valorFrete);
  }

  @Get('romaneio/:id/capa')
  @ApiOperation({ summary: 'Dados da Capa de Rota para impressão' })
  capaRota(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.getCapaRota(tenantId, id);
  }

  @Delete('romaneio/:id')
  @ApiOperation({ summary: 'Exclui a rota (desfaz roteirização)' })
  excluirRomaneio(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.excluirRomaneio(tenantId, id);
  }
}
