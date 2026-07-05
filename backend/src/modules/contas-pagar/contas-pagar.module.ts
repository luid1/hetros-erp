import { Module } from '@nestjs/common';
import { ContasPagarService } from './contas-pagar.service';
import { ContasPagarController } from './contas-pagar.controller';
import { PermissoesGuard } from '../../common/guards/permissoes.guard';

@Module({
  providers: [ContasPagarService, PermissoesGuard],
  controllers: [ContasPagarController],
  exports: [ContasPagarService],
})
export class ContasPagarModule {}
