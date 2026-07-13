import { Module } from '@nestjs/common';
import { PagamentosMotoristaService } from './pagamentos-motorista.service';
import { PagamentosMotoristaController } from './pagamentos-motorista.controller';
import { PermissoesGuard } from '../../common/guards/permissoes.guard';
import { ContasPagarModule } from '../contas-pagar/contas-pagar.module';

@Module({
  imports: [ContasPagarModule],
  providers: [PagamentosMotoristaService, PermissoesGuard],
  controllers: [PagamentosMotoristaController],
  exports: [PagamentosMotoristaService],
})
export class PagamentosMotoristaModule {}
