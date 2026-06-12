import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(Logger);
  app.useLogger(logger);
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  // API sits behind Caddy reverse proxy — trust the first X-Forwarded-For hop
  // so rate limiting (ThrottlerGuard) and logs key on the real client IP.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Security headers. CSP disabled because this is a JSON API and the default
  // CSP breaks the Swagger UI at /docs (inline scripts/styles). All other
  // helmet protections (HSTS, nosniff, frameguard, etc.) remain active.
  app.use(helmet({ contentSecurityPolicy: false }));

  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  // /health stays at the root (no /api/v1 prefix) for load-balancer probes
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('NexusERP API')
    .setDescription('NexusERP Enterprise Resource Planning API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication & authorization')
    .addTag('tenants', 'Tenant management')
    .addTag('users', 'User management')
    .addTag('roles', 'Role & permission management')
    .addTag('accounts', 'Chart of accounts')
    .addTag('journal-entries', 'General ledger journal entries')
    .addTag('invoices', 'Invoicing')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`NexusERP API is running on http://localhost:${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/docs`);
}

bootstrap();
