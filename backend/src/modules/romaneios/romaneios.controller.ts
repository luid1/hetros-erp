import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RomaneiosService } from './romaneios.service';
import { CurrentTenant } from '../../common/decorators/context.decorator';

@ApiTags('Romaneios')
@ApiBearerAuth()
@Controller('romaneios')
export class RomaneiosController {
  constructor(private service: RomaneiosService) {}

  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    return this.service.findAll(tenantId);
  }
}
