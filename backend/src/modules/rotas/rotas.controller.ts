import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, CurrentUser } from '../../common/decorators/context.decorator';
import { PermissoesGuard } from '../../common/guards/permissoes.guard';
import { RequirePermissao } from '../../common/decorators/permissoes.decorator';
import { RotasService } from './rotas.service';
import { RouteOptimizerService, OtimizarRotasDto } from './route-optimizer.service';
import {
  DeliveryConfirmationService,
  ConfirmarEntregaDto,
} from './delivery-confirmation.service';

interface ReqUser {
  id: string;
  nome?: string;
}

@ApiTags('Rotas / Logística')
@ApiBearerAuth()
@Controller('rotas')
export class RotasController {
  constructor(
    private readonly rotas: RotasService,
    private readonly optimizer: RouteOptimizerService,
    private readonly delivery: DeliveryConfirmationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista rotas de um dia/filial (Torre de Controle).' })
  listar(
    @CurrentTenant() tenantId: string,
    @Query('filialId') filialId: string,
    @Query('dataRota') dataRota?: string,
  ) {
    return this.rotas.listar(tenantId, filialId, dataRota);
  }

  @Get('motorista/:nome')
  @ApiOperation({ summary: 'Rotas ativas de um motorista (App Mobile).' })
  doMotorista(@CurrentTenant() tenantId: string, @Param('nome') nome: string) {
    return this.rotas.doMotorista(tenantId, decodeURIComponent(nome));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma rota e suas paradas.' })
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.rotas.findOne(tenantId, id);
  }

  @Post('otimizar')
  @UseGuards(PermissoesGuard)
  @RequirePermissao('LOGISTICA:OPERAR')
  @ApiOperation({
    summary: '🤖 Otimiza rotas com IA (cluster CEP + capacidade). Requer LOGISTICA:OPERAR.',
  })
  otimizar(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: ReqUser,
    @Body() dto: OtimizarRotasDto,
  ) {
    return this.optimizer.otimizar(tenantId, user.id, dto);
  }

  @Post('stops/:id/confirmar')
  @ApiOperation({
    summary: 'Confirma entrega (canhoto digital) e dispara Evento SEFAZ 110130.',
  })
  confirmar(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: ReqUser,
    @Param('id') id: string,
    @Body() dto: Omit<ConfirmarEntregaDto, 'routeStopId'>,
  ) {
    return this.delivery.confirmar(tenantId, user.id, { ...dto, routeStopId: id });
  }
}
