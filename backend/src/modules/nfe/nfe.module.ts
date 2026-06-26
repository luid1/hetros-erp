import { Module } from '@nestjs/common';
import { NFeService } from './nfe.service';
import { NFeController } from './nfe.controller';
import { EstoqueModule } from '../estoque/estoque.module';

@Module({
  imports: [EstoqueModule],
  providers: [NFeService],
  controllers: [NFeController],
  exports: [NFeService],
})
export class NFeModule {}
