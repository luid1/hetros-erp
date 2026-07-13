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
import { StatusFuncionario } from '@prisma/client';
import { PessoasService } from './pessoas.service';
import { CriarFuncionarioDto, AtualizarFuncionarioDto } from './dto/funcionario.dto';
import { CurrentTenant } from '../../common/decorators/context.decorator';
import { PermissoesGuard } from '../../common/guards/permissoes.guard';
import { RequirePermissao } from '../../common/decorators/permissoes.decorator';

@ApiTags('Pessoas (Funcionários)')
@ApiBearerAuth()
@Controller('funcionarios')
export class PessoasController {
  constructor(private service: PessoasService) {}

  @Get()
  @ApiOperation({ summary: 'Lista funcionários.' })
  listar(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: StatusFuncionario,
    @Query('filialId') filialId?: string,
  ) {
    return this.service.listar(tenantId, status, filialId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um funcionário.' })
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @UseGuards(PermissoesGuard)
  @RequirePermissao('FINANCEIRO:CONFIGURAR')
  @ApiOperation({ summary: 'Cadastra um funcionário.' })
  criar(@CurrentTenant() tenantId: string, @Body() dto: CriarFuncionarioDto) {
    return this.service.criar(tenantId, dto);
  }

  @Patch(':id')
  @UseGuards(PermissoesGuard)
  @RequirePermissao('FINANCEIRO:CONFIGURAR')
  @ApiOperation({ summary: 'Atualiza um funcionário.' })
  atualizar(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AtualizarFuncionarioDto,
  ) {
    return this.service.atualizar(tenantId, id, dto);
  }

  @Delete(':id')
  @UseGuards(PermissoesGuard)
  @RequirePermissao('FINANCEIRO:CONFIGURAR')
  @ApiOperation({ summary: 'Remove (ou desliga se já usado em folha) um funcionário.' })
  remover(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.remover(tenantId, id);
  }
}
