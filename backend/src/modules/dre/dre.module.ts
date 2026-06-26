import { Module } from '@nestjs/common';
import { DreService } from './dre.service';
import { DreController } from './dre.controller';

@Module({ providers: [DreService], controllers: [DreController], exports: [DreService] })
export class DreModule {}
