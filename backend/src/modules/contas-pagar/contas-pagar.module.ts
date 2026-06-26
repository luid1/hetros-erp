import { Module } from '@nestjs/common';
import { ContasPagarService } from './contas-pagar.service';
import { ContasPagarController } from './contas-pagar.controller';

@Module({ providers: [ContasPagarService], controllers: [ContasPagarController], exports: [ContasPagarService] })
export class ContasPagarModule {}
