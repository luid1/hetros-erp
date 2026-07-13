import { Module } from '@nestjs/common';
import { NFeService } from './nfe.service';
import { NFeController } from './nfe.controller';
import { EstoqueModule } from '../estoque/estoque.module';
import { FiscalModule } from '../fiscal/fiscal.module';
import { MockNfeProvider } from './providers/mock.provider';
import { RealNfeProvider } from './providers/real.provider';
import { nfeProviderFactory } from './providers/nfe-provider.factory';
import { CertificadoService } from './certificado.service';
import { CertificadoController } from './certificado.controller';

@Module({
  imports: [EstoqueModule, FiscalModule],
  providers: [
    NFeService,
    MockNfeProvider,
    RealNfeProvider,
    nfeProviderFactory,
    CertificadoService,
  ],
  controllers: [NFeController, CertificadoController],
  exports: [NFeService],
})
export class NFeModule {}
