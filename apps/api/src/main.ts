import './instrumentation';
import {
  BadRequestException,
  Logger,
  ValidationPipe,
  type ValidationError,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { json } from 'express';
import { AppModule } from './app.module';
import { APP_NAME, GLOBAL_API_PREFIX, SWAGGER_PATH } from './common/constants';
import { ApiExceptionFilter } from './common';

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): Array<{ path: string; message: string }> {
  const details: Array<{ path: string; message: string }> = [];

  for (const error of errors) {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      for (const message of Object.values(error.constraints)) {
        details.push({ path, message });
      }
    }

    if (error.children?.length) {
      details.push(...flattenValidationErrors(error.children, path));
    }
  }

  return details;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix(GLOBAL_API_PREFIX);
  app.use(json({ limit: '512kb' }));
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
      exceptionFactory: (errors: ValidationError[]) => {
        const details = flattenValidationErrors(errors);
        return new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed.',
          details,
        });
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle(APP_NAME)
    .setDescription(
      'Business process observability engine for monitoring business invariants. Public data plane: tag public-v1 (API keys). Control plane: session JWT.',
    )
    .setVersion('0.1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Paste a TemporalGuard access JWT (the tg_access token)',
    })
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'Workspace API key (tg_live_… / tg_test_…)',
      },
      'api-key',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        description:
          'Workspace API key as Bearer secret (must start with tg_). Used by the public data plane and SDKs.',
      },
      'api-key-bearer',
    )
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
