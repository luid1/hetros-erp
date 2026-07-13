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
import { StatusFolha } from '@prisma/client';
import { FolhaService } from './folha.service';
import {
  CriarFolhaDto,
  AtualizarFolhaDto,
  ItemFolhaDto,
  FecharFolhaDto,
} from './dto/folha.dto';
import { CurrentTenant, CurrentUser } from '../../common/decorators/context.decorator';
import { PermissoesGuard } from '../../common/guards/permissoes.guard';
import { RequirePermissao } from '../../common/decorators/permissoes.decorator';

interface ReqUser {
  id: string;
  nome?: string;
}

@ApiTags('Folha de Pagamento')
@ApiBearerAuth()
@Controller('folha')
export class FolhaController {
  constructor(private service: FolhaService) {}

  @Get()
  @ApiOperation({ summary: 'Lista folhas de pagamento.' })
  listar(@CurrentTenant() tenantId: string, @Query('status') status?: StatusFolha) {
    return this.service.listar(tenantId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma folha (com itens).' })
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @UseGuards(PermissoesGuard)
  @RequirePermissao('FINANCEIRO:CONFIGURAR')
  @ApiOperation({ summary: 'Cria uma folha para a competência.' })
  criar(@CurrentTenant() tenantId: string, @Body() dto: CriarFolhaDto) {
    return this.service.criar(tenantId, dto);
  }

  @Patch(':id')
  @UseGuards(PermissoesGuard)
  @RequirePermissao('FINANCEIRO:CONFIGURAR')
  @ApiOperation({ summary: 'Atualiza dados da folha (aberta).' })
  atualizar(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AtualizarFolhaDto,
  ) {
    return this.service.atualizar(tenantId, id, dto);
  }

  @Delete(':id')
  @UseGuards(PermissoesGuard)
  @RequirePermissao('FINANCEIRO:CONFIGURAR')
  @ApiOperation({ summary: 'Exclui uma folha (aberta).' })
  remover(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.remover(tenantId, id);
  }

  // ── Itens ──
  @Post(':id/gerar-padrao')
  @UseGuards(PermissoesGuard)
  @RequirePermissao('FINANCEIRO:CONFIGURAR')
  @ApiOperation({ summary: 'Popula a folha com o salário-base dos funcionários ativos.' })
  gerarPadrao(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.gerarPadrao(tenantId, id);
  }

  @Post(':id/itens')
  @UseGuards(PermissoesGuard)
  @RequirePermissao('FINANCEIRO:CONFIGURAR')
  @ApiOperation({ summary: 'Adiciona um item (provento/desconto) à folha.' })
  adicionarItem(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ItemFolhaDto,
  ) {
    return this.service.adicionarItem(tenantId, id, dto);
  }

  @Delete(':id/itens/:itemId')
  @UseGuards(PermissoesGuard)
  @RequirePermissao('FINANCEIRO:CONFIGURAR')
  @ApiOperation({ summary: 'Remove um item da folha.' })
  removerItem(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.service.removerItem(tenantId, id, itemId);
  }

  // ── Fechamento ──
  @Post(':id/fechar')
  @UseGuards(PermissoesGuard)
  @RequirePermissao('FINANCEIRO:OPERAR')
  @ApiOperation({ summary: 'Fecha a folha → gera contas a pagar (líquido) por funcionário.' })
  fechar(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: ReqUser,
    @Param('id') id: string,
    @Body() dto: FecharFolhaDto,
  ) {
    return this.service.fechar(tenantId, { id: user.id, nome: user.nome }, id, dto);
  }

  @Post(':id/reabrir')
  @UseGuards(PermissoesGuard)
  @RequirePermissao('FINANCEIRO:OPERAR')
  @ApiOperation({ summary: 'Reabre a folha → cancela as contas a pagar geradas.' })
  reabrir(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: ReqUser,
    @Param('id') id: string,
  ) {
    return this.service.reabrir(tenantId, { id: user.id, nome: user.nome }, id);
  }
}
