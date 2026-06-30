import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
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

  @Patch(':id/regime')
  @ApiOperation({ summary: 'Atualiza regime tributário / CNPJ / IE da filial emitente' })
  updateRegime(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateRegime(tenantId, id, dto);
  }
}
