import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MovimentacoesService } from './movimentacoes.service';
import { CurrentTenant } from '../../common/decorators/context.decorator';

@ApiTags('Movimentacoes')
@ApiBearerAuth()
@Controller('movimentacoes')
export class MovimentacoesController {
  constructor(private service: MovimentacoesService) {}

  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    return this.service.findAll(tenantId);
  }
}
