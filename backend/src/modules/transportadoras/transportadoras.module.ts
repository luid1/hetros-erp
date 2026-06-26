import { Module } from '@nestjs/common';
import { TransportadorasService } from './transportadoras.service';
import { TransportadorasController } from './transportadoras.controller';

@Module({ providers: [TransportadorasService], controllers: [TransportadorasController], exports: [TransportadorasService] })
export class TransportadorasModule {}
