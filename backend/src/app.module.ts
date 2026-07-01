import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { FiliaisModule } from './modules/filiais/filiais.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { FornecedoresModule } from './modules/fornecedores/fornecedores.module';
import { TransportadorasModule } from './modules/transportadoras/transportadoras.module';
import { ProdutosModule } from './modules/produtos/produtos.module';
import { EstoqueModule } from './modules/estoque/estoque.module';
import { MovimentacoesModule } from './modules/movimentacoes/movimentacoes.module';
import { InventarioModule } from './modules/inventario/inventario.module';
import { EntradasModule } from './modules/entradas/entradas.module';
import { PedidosModule } from './modules/pedidos/pedidos.module';
import { NFeModule } from './modules/nfe/nfe.module';
import { FiscalModule } from './modules/fiscal/fiscal.module';
import { RomaneiosModule } from './modules/romaneios/romaneios.module';
import { ContasReceberModule } from './modules/contas-receber/contas-receber.module';
import { ContasPagarModule } from './modules/contas-pagar/contas-pagar.module';
import { DreModule } from './modules/dre/dre.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CargaModule } from './modules/carga/carga.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),
    JwtModule.register({ secret: process.env.JWT_SECRET || 'secret', global: true }),
    PrismaModule,
    AuthModule,
    FiliaisModule,
    ClientesModule,
    FornecedoresModule,
    TransportadorasModule,
    ProdutosModule,
    EstoqueModule,
    MovimentacoesModule,
    InventarioModule,
    EntradasModule,
    PedidosModule,
    NFeModule,
    FiscalModule,
    RomaneiosModule,
    ContasReceberModule,
    ContasPagarModule,
    DreModule,
    AuditoriaModule,
    DashboardModule,
    CargaModule,
    UsuariosModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
