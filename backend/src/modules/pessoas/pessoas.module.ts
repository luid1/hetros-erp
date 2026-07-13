import { Module } from '@nestjs/common';
import { PessoasService } from './pessoas.service';
import { PessoasController } from './pessoas.controller';
import { PermissoesGuard } from '../../common/guards/permissoes.guard';

@Module({
  providers: [PessoasService, PermissoesGuard],
  controllers: [PessoasController],
  exports: [PessoasService],
})
export class PessoasModule {}
