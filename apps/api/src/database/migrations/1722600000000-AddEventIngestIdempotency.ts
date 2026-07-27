import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventIngestIdempotency1722600000000 implements MigrationInterface {
  name = 'AddEventIngestIdempotency1722600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "event_ingest_idempotency" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "businessId" uuid NOT NULL,
        "idempotencyKey" varchar(128) NOT NULL,
        "eventLogId" uuid NOT NULL,
        "expiresAt" timestamptz NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_event_ingest_idempotency_business"
          FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_event_ingest_idempotency_event_log"
          FOREIGN KEY ("eventLogId") REFERENCES "event_logs"("id")
          ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_event_ingest_idempotency_business_key"
       ON "event_ingest_idempotency" ("businessId", "idempotencyKey")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_event_ingest_idempotency_business"
       ON "event_ingest_idempotency" ("businessId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_event_ingest_idempotency_expires"
       ON "event_ingest_idempotency" ("expiresAt")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_event_ingest_idempotency_expires"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_event_ingest_idempotency_business"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_event_ingest_idempotency_business_key"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "event_ingest_idempotency"`);
  }
}
