import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // API Versioning configuration
  // Sets global prefix to /api
  app.setGlobalPrefix('api');

  // Enable URI versioning (e.g., /api/v1/resource, /api/v2/resource)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable CRORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Swagger Docs
  const config = new DocumentBuilder()
    .setTitle('Turvo API Documentation')
    .setDescription(`
      Multi-tenant turf booking platform API

      ## API Versioning
      All endpoints are versioned using URI versioning.
      - Current version: **v1**
      - Format: \`/api/v1/{resource}\`

      ## Authentication
      Most endpoints require JWT authentication. Include the token in the Authorization header:
      \`Authorization: Bearer <access_token>\`

      ## Rate Limiting
      API endpoints are rate limited to prevent abuse:
      - Login: 5 requests per 15 seconds
      - Write operations: 10 requests per minute
      - Creation operations: 20 requests per hour

      ## Multi-Tenancy
      Tenant context is required for most endpoints. Provide tenant ID via:
      - URL parameter: \`/:tenantId/resource\`
      - Query parameter: \`?tenantId={id}\`
      - Header: \`X-Tenant-ID: {id}\`
    `)
    .setVersion('1.0')
    .addTag('auth', 'Authentication and authorization endpoints')
    .addTag('invitations', 'User invitation and onboarding endpoints')
    .addTag('health', 'Health check and monitoring endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Refresh-JWT',
        description: 'Enter refresh JWT token',
        in: 'header',
      },
      'JWT-refresh',
    )
    .addServer(`http://localhost:${process.env.PORT ?? 9000}`, 'Local')
    .addServer('/api/v1', 'API Base Path')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Api Documentation',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 50px 0 }
      .swagger-ui .info .title { color: #4A90E2 }
    `,
  });

  await app.listen(process.env.PORT ?? 9000);
}
bootstrap().catch((error) => {
  Logger.error('Error: ', error);
  process.exit(1);
});
