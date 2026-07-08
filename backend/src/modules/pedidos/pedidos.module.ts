import { Module } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { PedidosController } from './pedidos.controller';
import { EstoqueModule } from '../estoque/estoque.module';

@Module({ imports: [EstoqueModule], providers: [PedidosService], controllers: [PedidosController], exports: [PedidosService] })
export class PedidosModule {}
