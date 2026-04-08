import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';

import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter.js';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const isProduction = process.env.NODE_ENV === 'production';

  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
      : true,
    credentials: true,
  });

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerEnabled = !isProduction || process.env.ENABLE_SWAGGER === 'true';

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('ECommerce API')
      .setDescription(
        'Production-oriented monolithic NestJS backend for e-commerce applications',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
