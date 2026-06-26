import { Module } from '@nestjs/common';
import { CargaService } from './carga.service';
import { CargaController } from './carga.controller';

@Module({ providers: [CargaService], controllers: [CargaController] })
export class CargaModule {}
