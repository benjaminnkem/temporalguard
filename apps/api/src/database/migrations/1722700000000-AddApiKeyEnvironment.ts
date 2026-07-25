import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApiKeyEnvironment1722700000000 implements MigrationInterface {
  name = 'AddApiKeyEnvironment1722700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "business_api_keys" ADD COLUMN "environment" varchar(16) NOT NULL DEFAULT 'live'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_business_api_keys_environment" ON "business_api_keys" ("environment")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_business_api_keys_environment"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business_api_keys" DROP COLUMN IF EXISTS "environment"`,
    );
  }
}
