import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { EstoqueService } from './estoque.service';
import { CurrentTenant, CurrentUser, Modulo } from '../../common/decorators/context.decorator';

@ApiTags('Estoque/WMS')
@ApiBearerAuth()
@Modulo('ESTOQUE')
@Controller('estoque')
export class EstoqueController {
  constructor(private service: EstoqueService) {}

  @Get(':filialId/saldo')
  @ApiOperation({ summary: 'Posição de estoque da filial (posição completa)' })
  @ApiQuery({ name: 'alertaValidade', required: false, type: Boolean })
  posicao(
    @CurrentTenant() tenantId: string,
    @Param('filialId') filialId: string,
    @Query('alertaValidade') alertaValidade?: string,
  ) {
    return this.service.getPosicaoGeral(tenantId, filialId, {
      alertaValidade: alertaValidade === 'true',
    });
  }

  @Get(':filialId/saldo/:produtoId')
  @ApiOperation({ summary: 'Saldo de um produto específico (por lote/localização)' })
  saldoProduto(
    @CurrentTenant() tenantId: string,
    @Param('filialId') filialId: string,
    @Param('produtoId') produtoId: string,
    @Query('loteId') loteId?: string,
  ) {
    return this.service.getSaldo(tenantId, filialId, produtoId, loteId);
  }

  @Get(':filialId/alertas-validade')
  @ApiOperation({ summary: 'FLV/Perecíveis vencendo nos próximos N dias' })
  alertasValidade(
    @CurrentTenant() tenantId: string,
    @Param('filialId') filialId: string,
    @Query('dias') dias?: string,
  ) {
    return this.service.getAlertasValidade(tenantId, filialId, dias ? Number(dias) : 5);
  }

  @Get(':filialId/fefo/:produtoId')
  @ApiOperation({ summary: 'Lotes do produto ordenados por validade (FEFO) — sugestão de separação' })
  fefo(@CurrentTenant() tenantId: string, @Param('filialId') filialId: string, @Param('produtoId') produtoId: string) {
    return this.service.getFefoLotes(tenantId, filialId, produtoId);
  }

  @Get(':filialId/a-comprar')
  @ApiOperation({ summary: 'Produtos com estoque negativo ou abaixo do mínimo (a comprar/repor)' })
  aComprar(@CurrentTenant() tenantId: string, @Param('filialId') filialId: string) {
    return this.service.getAComprar(tenantId, filialId);
  }

  @Get(':filialId/movimentacoes')
  @ApiOperation({ summary: 'Extrato de movimentações da filial' })
  movimentacoes(
    @CurrentTenant() tenantId: string,
    @Param('filialId') filialId: string,
    @Query('produtoId') produtoId?: string,
    @Query('tipo') tipo?: any,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    return this.service.getMovimentacoes(tenantId, filialId, {
      produtoId,
      tipo,
      dataInicio: dataInicio ? new Date(dataInicio) : undefined,
      dataFim: dataFim ? new Date(dataFim) : undefined,
    });
  }

  @Post('ajuste')
  @ApiOperation({ summary: 'Ajuste manual de estoque (perda, avaria, inventário)' })
  ajuste(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() body: any) {
    return this.service.movimentar(tenantId, { ...body, usuarioId: user.id });
  }

  @Post('transferencia')
  @ApiOperation({ summary: 'Transferência entre filiais/boxes' })
  transferir(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() body: any) {
    return this.service.transferir(tenantId, { ...body, usuarioId: user.id });
  }
}
