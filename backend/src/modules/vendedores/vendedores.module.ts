import { Module } from '@nestjs/common';
import { VendedoresService } from './vendedores.service';
import { VendedoresController } from './vendedores.controller';
import { PermissoesGuard } from '../../common/guards/permissoes.guard';

@Module({
  providers: [VendedoresService, PermissoesGuard],
  controllers: [VendedoresController],
  exports: [VendedoresService],
})
export class VendedoresModule {}
