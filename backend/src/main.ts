import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // El frontend (Next.js) reenvía la IP real del usuario en X-Forwarded-For.
  // Solo se confía en ese encabezado cuando viene de redes internas (Docker / localhost).
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');

  app.use(helmet());
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3001').split(','),
    credentials: true,
  });

  // Valida y transforma todos los DTOs. `whitelist` descarta campos que no estén declarados.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swagger = new DocumentBuilder()
    .setTitle('Sistema de Nómina - API')
    .setDescription('Gestión de empleados, adelantos, préstamos y pagos semanales/quincenales')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger), {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`API lista en http://localhost:${port}/api  ·  Swagger: http://localhost:${port}/api/docs`, 'Bootstrap');
}
await bootstrap();
