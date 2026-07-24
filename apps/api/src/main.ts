import './instrumentation';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { APP_NAME, GLOBAL_API_PREFIX, SWAGGER_PATH } from './common/constants';
import { ApiExceptionFilter } from './common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix(GLOBAL_API_PREFIX);
  app.enableCors({
    origin: configService.get<string>('auth.frontendOrigin'),
    credentials: true,
  });
  app.use(cookieParser());
  app.useGlobalFilters(new ApiExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle(APP_NAME)
    .setDescription(
      'Business process observability engine for monitoring business invariants',
    )
    .setVersion('0.1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Paste a TemporalGuard access JWT (the tg_access token)',
    })
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(SWAGGER_PATH, app, document);

  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port);
  logger.debug(`Application is running on: http://localhost:${port}`);
  logger.debug(
    `Swagger documentation is available at: http://localhost:${port}/${SWAGGER_PATH}`,
  );
}

void bootstrap();
