import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.enableCors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix('api/v1');

  const swagger = new DocumentBuilder()
    .setTitle('ERP WMS Industrial — Hetros/NewOxxy')
    .setDescription('API Enterprise Multi-tenant para Gestão de Armazém e Distribuição')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth')
    .addTag('Filiais')
    .addTag('Clientes')
    .addTag('Fornecedores')
    .addTag('Produtos')
    .addTag('Estoque/WMS')
    .addTag('Pedidos')
    .addTag('NF-e')
    .addTag('Romaneios')
    .addTag('Financeiro')
    .addTag('Auditoria')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`\n🏭 ERP WMS rodando em http://localhost:${port}`);
  console.log(`📚 Swagger: http://localhost:${port}/api/docs\n`);
}
bootstrap();
