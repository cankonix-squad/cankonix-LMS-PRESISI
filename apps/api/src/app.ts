import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
export async function createApp() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const config = new DocumentBuilder()
    .setTitle('Lemdiklat Polri API')
    .setVersion('1')
    .build();
  SwaggerModule.setup(
    'api/v1/docs',
    app,
    SwaggerModule.createDocument(app, config),
  );
  app.enableShutdownHooks();
  return app;
}
