import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: ['../../.env', '.env'], quiet: true });

export default new DataSource({
  type: 'postgres',
  ...(process.env.DATABASE_URL ? { url: process.env.DATABASE_URL } : {}),
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'temporalguard',
  password: process.env.DB_PASSWORD ?? 'temporalguard',
  database: process.env.DB_DATABASE ?? 'temporalguard',
  schema: process.env.DB_SCHEMA ?? 'public',
  entities: [`${__dirname}/../modules/**/*.entity{.ts,.js}`],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  synchronize: false,
});
