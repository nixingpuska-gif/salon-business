import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Salon Platform API')
    .setDescription('API for Salon Management Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Tenants', 'Tenant (salon) management')
    .addTag('Branches', 'Branch management')
    .addTag('Employees', 'Employee management')
    .addTag('Services', 'Service and category management')
    .addTag('Clients', 'Client management')
    .addTag('Booking', 'Appointment booking')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           SALON PLATFORM API - STARTED                    ║
╠═══════════════════════════════════════════════════════════╣
║  Server:    http://localhost:${port}                         ║
║  API:       http://localhost:${port}/api/v1                  ║
║  Swagger:   http://localhost:${port}/api/docs                ║
╚═══════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
