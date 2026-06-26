import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FiliaisService } from './filiais.service';
import { CurrentTenant } from '../../common/decorators/context.decorator';

@ApiTags('Filiais')
@ApiBearerAuth()
@Controller('filiais')
export class FiliaisController {
  constructor(private service: FiliaisService) {}

  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    return this.service.findAll(tenantId);
  }
}
