import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { PermissoesGuard } from '../../common/guards/permissoes.guard';

@Module({
  providers: [InvoicesService, PermissoesGuard],
  controllers: [InvoicesController],
  exports: [InvoicesService],
})
export class InvoicesModule {}
