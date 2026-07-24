import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventLogTraceContext1722200000000 implements MigrationInterface {
  name = 'AddEventLogTraceContext1722200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_logs" ADD COLUMN "traceId" varchar(32)`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_logs" ADD COLUMN "spanId" varchar(16)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_event_logs_trace_id" ON "event_logs" ("traceId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_event_logs_trace_id"`);
    await queryRunner.query(`ALTER TABLE "event_logs" DROP COLUMN "spanId"`);
    await queryRunner.query(`ALTER TABLE "event_logs" DROP COLUMN "traceId"`);
  }
}
