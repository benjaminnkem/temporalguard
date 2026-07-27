import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvestigationRuntime1722700000000 implements MigrationInterface {
  name = 'AddInvestigationRuntime1722700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "investigations" ADD COLUMN "report" jsonb`,
    );
    await queryRunner.query(`
      CREATE TABLE "signoz_query_audits" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "businessId" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "investigationId" uuid REFERENCES "investigations"("id") ON DELETE SET NULL,
        "signal" varchar(16) NOT NULL,
        "queryHash" varchar(64) NOT NULL,
        "rangeStart" timestamptz NOT NULL,
        "rangeEnd" timestamptz NOT NULL,
        "requestedLimit" integer NOT NULL CHECK ("requestedLimit" > 0),
        "returnedRows" integer NOT NULL DEFAULT 0 CHECK ("returnedRows" >= 0),
        "durationMs" integer NOT NULL CHECK ("durationMs" >= 0),
        "outcome" varchar(24) NOT NULL,
        "statusCode" integer,
        "errorCode" varchar(120),
        CHECK ("rangeEnd" > "rangeStart")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "investigation_stream_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "businessId" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "investigationId" uuid NOT NULL REFERENCES "investigations"("id") ON DELETE CASCADE,
        "sequence" bigint NOT NULL,
        "type" varchar(120) NOT NULL,
        "data" jsonb NOT NULL DEFAULT '{}',
        CONSTRAINT "UQ_stream_events_investigation_sequence"
          UNIQUE ("investigationId", "sequence")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_signoz_query_audits_company_created" ON "signoz_query_audits" ("businessId", "createdAt" DESC, "id" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_signoz_query_audits_investigation" ON "signoz_query_audits" ("investigationId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stream_events_company_created" ON "investigation_stream_events" ("businessId", "createdAt" DESC)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "investigation_stream_events"`);
    await queryRunner.query(`DROP TABLE "signoz_query_audits"`);
    await queryRunner.query(
      `ALTER TABLE "investigations" DROP COLUMN "report"`,
    );
  }
}
