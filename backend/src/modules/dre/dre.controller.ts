import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DreService } from './dre.service';
import { CurrentTenant } from '../../common/decorators/context.decorator';

@ApiTags('Dre')
@ApiBearerAuth()
@Controller('dre')
export class DreController {
  constructor(private service: DreService) {}

  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    return this.service.findAll(tenantId);
  }
}
