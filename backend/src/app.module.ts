import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { FiliaisModule } from './modules/filiais/filiais.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { FornecedoresModule } from './modules/fornecedores/fornecedores.module';
import { TransportadorasModule } from './modules/transportadoras/transportadoras.module';
import { VeiculosModule } from './modules/veiculos/veiculos.module';
import { CustosModule } from './modules/custos/custos.module';
import { ProdutosModule } from './modules/produtos/produtos.module';
import { EstoqueModule } from './modules/estoque/estoque.module';
import { MovimentacoesModule } from './modules/movimentacoes/movimentacoes.module';
import { InventarioModule } from './modules/inventario/inventario.module';
import { EntradasModule } from './modules/entradas/entradas.module';
import { ComprasModule } from './modules/compras/compras.module';
import { PedidosModule } from './modules/pedidos/pedidos.module';
import { NFeModule } from './modules/nfe/nfe.module';
import { FiscalModule } from './modules/fiscal/fiscal.module';
import { FiscalReformaModule } from './modules/fiscal-reforma/fiscal-reforma.module';
import { InterpretadorModule } from './modules/interpretador/interpretador.module';
import { RomaneiosModule } from './modules/romaneios/romaneios.module';
import { ContasReceberModule } from './modules/contas-receber/contas-receber.module';
import { ContasPagarModule } from './modules/contas-pagar/contas-pagar.module';
import { FluxoCaixaModule } from './modules/fluxo-caixa/fluxo-caixa.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { DreModule } from './modules/dre/dre.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CargaModule } from './modules/carga/carga.module';
import { RotasModule } from './modules/rotas/rotas.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissoesGuard } from './common/guards/permissoes.guard';
import { FilialGuard } from './common/guards/filial.guard';
import { getJwtSecret } from './common/config/jwt-secret';
import { HealthController } from './health.controller';

@Module({
  imports: [
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),
    // Rate limiting global: 120 req/min por IP (protege contra abuso/brute-force).
    // Endpoints sensíveis (login, IA) têm limites mais rígidos via @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    JwtModule.register({ secret: getJwtSecret(), global: true }),
    PrismaModule,
    AuthModule,
    FiliaisModule,
    ClientesModule,
    FornecedoresModule,
    TransportadorasModule,
    VeiculosModule,
    CustosModule,
    ProdutosModule,
    EstoqueModule,
    MovimentacoesModule,
    InventarioModule,
    EntradasModule,
    ComprasModule,
    PedidosModule,
    NFeModule,
    FiscalModule,
    FiscalReformaModule,
    InterpretadorModule,
    RomaneiosModule,
    ContasReceberModule,
    ContasPagarModule,
    FluxoCaixaModule,
    InvoicesModule,
    RotasModule,
    DreModule,
    AuditoriaModule,
    DashboardModule,
    CargaModule,
    UsuariosModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // RBAC global: roda depois do JwtAuthGuard (que popula req.user). Rotas sem
    // @RequirePermissao passam direto; as com decorator agora são SEMPRE checadas
    // — antes o guard só valia em controllers que o declaravam localmente.
    { provide: APP_GUARD, useClass: PermissoesGuard },
    // Isolamento entre filiais/boxes da mesma empresa: valida qualquer filialId
    // recebido contra as filiais do usuário. ADMIN passa.
    { provide: APP_GUARD, useClass: FilialGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
