import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TransportadorasService } from './transportadoras.service';
import { CurrentTenant } from '../../common/decorators/context.decorator';

@ApiTags('Transportadoras')
@ApiBearerAuth()
@Controller('transportadoras')
export class TransportadorasController {
  constructor(private service: TransportadorasService) {}

  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    return this.service.findAll(tenantId);
  }
}
