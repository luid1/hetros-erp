import { Module } from '@nestjs/common';
import { FiscalService } from './fiscal.service';
import { FiscalController } from './fiscal.controller';
import { DocumentosTransporteService } from './documentos-transporte.service';
import { DocumentosTransporteController } from './documentos-transporte.controller';

@Module({
  providers: [FiscalService, DocumentosTransporteService],
  controllers: [FiscalController, DocumentosTransporteController],
  exports: [FiscalService, DocumentosTransporteService],
})
export class FiscalModule {}
