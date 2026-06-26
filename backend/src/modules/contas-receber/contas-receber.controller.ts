import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ContasReceberService } from './contas-receber.service';
import { CurrentTenant } from '../../common/decorators/context.decorator';

@ApiTags('ContasReceber')
@ApiBearerAuth()
@Controller('contas-receber')
export class ContasReceberController {
  constructor(private service: ContasReceberService) {}

  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    return this.service.findAll(tenantId);
  }
}
