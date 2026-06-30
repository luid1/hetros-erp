import { Module } from '@nestjs/common';
import { NFeService } from './nfe.service';
import { NFeController } from './nfe.controller';
import { EstoqueModule } from '../estoque/estoque.module';
import { FiscalModule } from '../fiscal/fiscal.module';

@Module({
  imports: [EstoqueModule, FiscalModule],
  providers: [NFeService],
  controllers: [NFeController],
  exports: [NFeService],
})
export class NFeModule {}
