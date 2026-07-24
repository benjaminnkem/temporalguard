import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('TemporalGuard API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  it('/api/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          status: 'ok',
          info: {
            database: { status: 'up' },
            redis: { status: 'up' },
          },
        });
      });
  });

  it('/api/auth/me rejects an unauthenticated request', () => {
    return request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('registers, reads, refreshes, and logs out an authenticated session', async () => {
    const agent = request.agent(app.getHttpServer());
    const email = `e2e-${Date.now()}@example.com`;

    await agent
      .post('/api/auth/register')
      .field('firstName', 'Ada')
      .field('lastName', 'Okafor')
      .field('email', email)
      .field('password', 'Password123!')
      .field('businessName', 'Northstar E2E')
      .expect(201)
      .expect(({ body }) => {
        const responseBody = body as unknown as {
          user: Record<string, unknown>;
          workspace: Record<string, unknown>;
        };
        expect(responseBody).toMatchObject({
          user: { email },
          workspace: { name: 'Northstar E2E' },
        });
        expect(responseBody.user).not.toHaveProperty('passwordHash');
      });

    await agent.get('/api/auth/me').expect(200);
    await agent.post('/api/auth/refresh').expect(200);
    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
  });

  afterAll(async () => {
    await app.close();
  });
});
