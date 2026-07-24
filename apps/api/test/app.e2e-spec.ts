import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { Rule } from './../src/modules/rules/entities';

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

  it('enables, disables, and soft deletes a workspace rule', async () => {
    const agent = request.agent(app.getHttpServer());
    const unique = Date.now();

    await agent
      .post('/api/auth/register')
      .field('firstName', 'Rule')
      .field('lastName', 'Owner')
      .field('email', `rules-${unique}@example.com`)
      .field('password', 'Password123!')
      .field('businessName', `Rules E2E ${unique}`)
      .expect(201);

    const createResponse = await agent
      .post('/api/rules')
      .send({
        name: `Payment completion ${unique}`,
        triggerEvent: `payment.authorized_${unique}`,
        expectedEvents: [`payment.completed_${unique}`],
        operator: 'all',
        timeoutValue: 15,
        timeoutUnit: 'minutes',
        severity: 'high',
        enabled: true,
      })
      .expect(201);
    const created = createResponse.body as unknown as {
      id: string;
      enabled: boolean;
    };
    const updatedName = `Updated payment completion ${unique}`;
    await agent
      .patch(`/api/rules/${created.id}`)
      .send({
        name: updatedName,
        triggerFilters: [
          { attribute: 'amount', operator: 'greater_than', value: 100 },
        ],
        correlationKey: 'payment.id',
        environments: ['production', 'staging'],
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: created.id,
          name: updatedName,
          correlationKey: 'payment.id',
          environments: ['production', 'staging'],
        });
      });
    await agent
      .get('/api/rules')
      .expect(200)
      .expect(({ body }) => {
        const rules = body as unknown as Array<{ id: string }>;
        expect(rules.filter((rule) => rule.id === created.id)).toHaveLength(1);
      });

    const workflowResponse = await agent
      .post('/api/workflows')
      .send({
        ruleId: created.id,
        externalId: `payment-${unique}`,
        name: `Payment workflow ${unique}`,
      })
      .expect(201);
    const workflow = workflowResponse.body as unknown as { id: string };

    await agent
      .patch(`/api/rules/${created.id}/status`)
      .send({ enabled: false })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ id: created.id, enabled: false });
      });

    await agent
      .patch(`/api/rules/${created.id}/status`)
      .send({ enabled: true })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ id: created.id, enabled: true });
      });

    await agent.delete(`/api/rules/${created.id}`).expect(204);
    await agent.get(`/api/rules/${created.id}`).expect(404);
    await agent
      .get(`/api/workflows/${workflow.id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: workflow.id,
          rule: { id: created.id, name: updatedName },
        });
      });
    await agent
      .get('/api/rules')
      .expect(200)
      .expect(({ body }) => {
        expect(body).not.toEqual(
          expect.arrayContaining([expect.objectContaining({ id: created.id })]),
        );
      });

    const deleted = await app
      .get(DataSource)
      .getRepository(Rule)
      .findOne({ where: { id: created.id }, withDeleted: true });
    expect(deleted).toMatchObject({ id: created.id, enabled: false });
    expect(deleted?.deletedAt).toBeInstanceOf(Date);
  });

  afterAll(async () => {
    await app.close();
  });
});
