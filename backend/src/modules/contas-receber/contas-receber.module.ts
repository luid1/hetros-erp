import { Module } from '@nestjs/common';
import { ContasReceberService } from './contas-receber.service';
import { ContasReceberController } from './contas-receber.controller';

@Module({ providers: [ContasReceberService], controllers: [ContasReceberController], exports: [ContasReceberService] })
export class ContasReceberModule {}
