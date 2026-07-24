import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBusinessSettingsAndApiKeys1722500000000
  implements MigrationInterface
{
  name = 'AddBusinessSettingsAndApiKeys1722500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "businesses" ADD COLUMN "website" varchar(2048)`,
    );
    await queryRunner.query(
      `ALTER TABLE "businesses" ADD COLUMN "description" text`,
    );

    await queryRunner.query(`
      CREATE TABLE "business_api_keys" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "businessId" uuid NOT NULL,
        "name" varchar(120) NOT NULL,
        "keyPrefix" varchar(24) NOT NULL,
        "keyHash" varchar(255) NOT NULL,
        "lastUsedAt" timestamptz,
        "revokedAt" timestamptz,
        "createdByUserId" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_business_api_keys_business"
          FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_business_api_keys_created_by"
          FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
          ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_business_api_keys_business" ON "business_api_keys" ("businessId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_business_api_keys_prefix" ON "business_api_keys" ("keyPrefix")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_business_api_keys_hash" ON "business_api_keys" ("keyHash")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_business_api_keys_hash"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_business_api_keys_prefix"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_business_api_keys_business"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "business_api_keys"`);
    await queryRunner.query(
      `ALTER TABLE "businesses" DROP COLUMN IF EXISTS "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "businesses" DROP COLUMN IF EXISTS "website"`,
    );
  }
}
