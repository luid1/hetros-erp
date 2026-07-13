import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StatusPagamentoMotorista } from '@prisma/client';
import { PagamentosMotoristaService } from './pagamentos-motorista.service';
import {
  CriarPagamentoMotoristaDto,
  AprovarPagamentoMotoristaDto,
} from './dto/pagamento-motorista.dto';
import { CurrentTenant, CurrentUser } from '../../common/decorators/context.decorator';
import { PermissoesGuard } from '../../common/guards/permissoes.guard';
import { RequirePermissao } from '../../common/decorators/permissoes.decorator';

interface ReqUser {
  id: string;
  nome?: string;
}

@ApiTags('Pagamentos de Motorista')
@ApiBearerAuth()
@Controller('pagamentos-motorista')
export class PagamentosMotoristaController {
  constructor(private service: PagamentosMotoristaService) {}

  @Get()
  @ApiOperation({ summary: 'Lista pagamentos de motorista (diárias/fretes).' })
  listar(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: StatusPagamentoMotorista,
    @Query('motoristaId') motoristaId?: string,
  ) {
    return this.service.listar(tenantId, status, motoristaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um pagamento.' })
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @UseGuards(PermissoesGuard)
  @RequirePermissao('FINANCEIRO:OPERAR')
  @ApiOperation({ summary: 'Cria manualmente um pagamento de motorista.' })
  criar(@CurrentTenant() tenantId: string, @Body() dto: CriarPagamentoMotoristaDto) {
    return this.service.criar(tenantId, dto);
  }

  @Patch(':id/valor')
  @UseGuards(PermissoesGuard)
  @RequirePermissao('FINANCEIRO:OPERAR')
  @ApiOperation({ summary: 'Ajusta o valor de um pagamento pendente.' })
  atualizarValor(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: { valor: number },
  ) {
    return this.service.atualizarValor(tenantId, id, body.valor);
  }

  @Post(':id/aprovar')
  @UseGuards(PermissoesGuard)
  @RequirePermissao('FINANCEIRO:OPERAR')
  @ApiOperation({ summary: 'Aprova → gera Conta a Pagar (frete de motorista).' })
  aprovar(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: ReqUser,
    @Param('id') id: string,
    @Body() dto: AprovarPagamentoMotoristaDto,
  ) {
    return this.service.aprovar(tenantId, { id: user.id, nome: user.nome }, id, dto);
  }

  @Post(':id/cancelar')
  @UseGuards(PermissoesGuard)
  @RequirePermissao('FINANCEIRO:OPERAR')
  @ApiOperation({ summary: 'Cancela o pagamento (e a conta a pagar, se gerada).' })
  cancelar(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: ReqUser,
    @Param('id') id: string,
    @Body() body: { motivo?: string },
  ) {
    return this.service.cancelar(tenantId, { id: user.id, nome: user.nome }, id, body?.motivo);
  }

  @Post('sincronizar')
  @UseGuards(PermissoesGuard)
  @RequirePermissao('FINANCEIRO:OPERAR')
  @ApiOperation({ summary: 'Gera pagamentos pendentes p/ rotas concluídas sem pagamento.' })
  sincronizar(@CurrentTenant() tenantId: string) {
    return this.service.sincronizar(tenantId);
  }
}
