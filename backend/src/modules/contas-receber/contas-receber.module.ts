import { Module } from '@nestjs/common';
import { ContasReceberService } from './contas-receber.service';
import { ContasReceberController } from './contas-receber.controller';
import { PermissoesGuard } from '../../common/guards/permissoes.guard';

@Module({
  providers: [ContasReceberService, PermissoesGuard],
  controllers: [ContasReceberController],
  exports: [ContasReceberService],
})
export class ContasReceberModule {}
