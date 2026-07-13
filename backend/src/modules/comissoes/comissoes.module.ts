import { Module } from '@nestjs/common';
import { ComissoesService } from './comissoes.service';
import { ComissoesController } from './comissoes.controller';
import { ContasPagarModule } from '../contas-pagar/contas-pagar.module';
import { PermissoesGuard } from '../../common/guards/permissoes.guard';

@Module({
  imports: [ContasPagarModule],
  providers: [ComissoesService, PermissoesGuard],
  controllers: [ComissoesController],
  exports: [ComissoesService],
})
export class ComissoesModule {}
