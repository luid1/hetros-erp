import { Module } from '@nestjs/common';
import { RomaneiosService } from './romaneios.service';
import { RomaneiosController } from './romaneios.controller';

@Module({ providers: [RomaneiosService], controllers: [RomaneiosController], exports: [RomaneiosService] })
export class RomaneiosModule {}
