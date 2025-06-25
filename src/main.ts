import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { SuccessResponseInterceptor } from './common/interceptors/success-response.interceptor';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // <-- aquí
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new SuccessResponseInterceptor());
  // Habilitar validación global para los DTOs
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🚀 Aplicación corriendo en: http://localhost:${port}/api/v1`);
}
bootstrap();
