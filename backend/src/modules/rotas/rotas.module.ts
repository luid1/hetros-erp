import { Module } from '@nestjs/common';
import { RotasController } from './rotas.controller';
import { RotasService } from './rotas.service';
import { RouteOptimizerService } from './route-optimizer.service';
import { DeliveryConfirmationService } from './delivery-confirmation.service';
import { PermissoesGuard } from '../../common/guards/permissoes.guard';

@Module({
  controllers: [RotasController],
  providers: [
    RotasService,
    RouteOptimizerService,
    DeliveryConfirmationService,
    PermissoesGuard,
  ],
  exports: [RouteOptimizerService, DeliveryConfirmationService],
})
export class RotasModule {}
