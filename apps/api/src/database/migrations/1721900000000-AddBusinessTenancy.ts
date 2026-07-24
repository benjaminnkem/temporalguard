import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBusinessTenancy1721900000000 implements MigrationInterface {
  name = 'AddBusinessTenancy1721900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "businesses" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "name" varchar(255) NOT NULL,
        CONSTRAINT "PK_businesses" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      INSERT INTO "businesses" ("id", "name")
      VALUES ('00000000-0000-4000-8000-000000000001', 'Legacy Business')
    `);

    for (const table of [
      'business_events',
      'event_logs',
      'external_workflows',
      'rules',
      'workflows',
      'violations',
    ]) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD COLUMN "businessId" uuid
        DEFAULT '00000000-0000-4000-8000-000000000001'
      `);
      await queryRunner.query(`
        ALTER TABLE "${table}" ALTER COLUMN "businessId" SET NOT NULL
      `);
      await queryRunner.query(`
        ALTER TABLE "${table}" ALTER COLUMN "businessId" DROP DEFAULT
      `);
      await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD CONSTRAINT "FK_${table}_business"
        FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
        ON DELETE CASCADE
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_${table}_business" ON "${table}" ("businessId")
      `);
    }

    await queryRunner.query(
      `ALTER TABLE "business_events" DROP CONSTRAINT "UQ_business_events_name"`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_business_events_business_name"
      ON "business_events" ("businessId", "name")
    `);
    await queryRunner.query(
      `ALTER TABLE "external_workflows" DROP CONSTRAINT "UQ_external_workflows_external_id"`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_external_workflows_business_external_id"
      ON "external_workflows" ("businessId", "externalId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_external_workflows_business_external_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "external_workflows"
      ADD CONSTRAINT "UQ_external_workflows_external_id" UNIQUE ("externalId")
    `);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_business_events_business_name"`,
    );
    await queryRunner.query(`
      ALTER TABLE "business_events"
      ADD CONSTRAINT "UQ_business_events_name" UNIQUE ("name")
    `);

    for (const table of [
      'violations',
      'workflows',
      'rules',
      'external_workflows',
      'event_logs',
      'business_events',
    ]) {
      await queryRunner.query(`DROP INDEX "public"."IDX_${table}_business"`);
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT "FK_${table}_business"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN "businessId"`,
      );
    }
    await queryRunner.query(`DROP TABLE "businesses"`);
  }
}
