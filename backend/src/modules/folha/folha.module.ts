import { Module } from '@nestjs/common';
import { FolhaService } from './folha.service';
import { FolhaController } from './folha.controller';
import { PermissoesGuard } from '../../common/guards/permissoes.guard';
import { ContasPagarModule } from '../contas-pagar/contas-pagar.module';

@Module({
  imports: [ContasPagarModule],
  providers: [FolhaService, PermissoesGuard],
  controllers: [FolhaController],
  exports: [FolhaService],
})
export class FolhaModule {}
