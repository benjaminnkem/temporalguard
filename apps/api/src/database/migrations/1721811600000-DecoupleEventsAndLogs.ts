import { MigrationInterface, QueryRunner } from 'typeorm';

export class DecoupleEventsAndLogs1721811600000 implements MigrationInterface {
  name = 'DecoupleEventsAndLogs1721811600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "business_events" RENAME TO "event_logs_legacy"`,
    );
    await queryRunner.query(`
      CREATE TABLE "business_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "name" varchar(255) NOT NULL,
        "type" "public"."business_events_type_enum" NOT NULL DEFAULT 'business',
        "description" text,
        "metadata" jsonb,
        CONSTRAINT "UQ_business_events_name" UNIQUE ("name"),
        CONSTRAINT "PK_business_event_definitions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      INSERT INTO "business_events" ("name")
      SELECT DISTINCT "eventName" FROM "event_logs_legacy"
      UNION
      SELECT DISTINCT "triggerEvent" FROM "rules"
      UNION
      SELECT DISTINCT unnest("expectedEvents") FROM "rules"
      ON CONFLICT ("name") DO NOTHING
    `);
    await queryRunner.query(`
      CREATE TABLE "external_workflows" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "externalId" varchar(255) NOT NULL,
        CONSTRAINT "UQ_external_workflows_external_id" UNIQUE ("externalId"),
        CONSTRAINT "PK_external_workflows" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      INSERT INTO "external_workflows" ("externalId")
      SELECT DISTINCT "externalId" FROM "workflows"
      WHERE "externalId" IS NOT NULL
      UNION
      SELECT DISTINCT "externalWorkflowId" FROM "event_logs_legacy"
      WHERE "externalWorkflowId" IS NOT NULL
      ON CONFLICT ("externalId") DO NOTHING
    `);
    await queryRunner.query(`
      CREATE TABLE "event_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "eventId" uuid NOT NULL,
        "timestamp" timestamptz NOT NULL,
        "payload" jsonb,
        "externalWorkflowRecordId" uuid,
        CONSTRAINT "PK_event_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_event_logs_event" FOREIGN KEY ("eventId")
          REFERENCES "business_events"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_event_logs_external_workflow" FOREIGN KEY ("externalWorkflowRecordId")
          REFERENCES "external_workflows"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      INSERT INTO "event_logs" (
        "id", "createdAt", "updatedAt", "eventId", "timestamp", "payload",
        "externalWorkflowRecordId"
      )
      SELECT legacy."id", legacy."createdAt", legacy."updatedAt", event."id",
             legacy."timestamp", legacy."payload", external_workflow."id"
      FROM "event_logs_legacy" legacy
      JOIN "business_events" event ON event."name" = legacy."eventName"
      LEFT JOIN "external_workflows" external_workflow
        ON external_workflow."externalId" = legacy."externalWorkflowId"
    `);
    await queryRunner.query(
      `ALTER TABLE "rules" ADD COLUMN "triggerEventId" uuid`,
    );
    await queryRunner.query(`
      UPDATE "rules" rule
      SET "triggerEventId" = event."id"
      FROM "business_events" event
      WHERE event."name" = rule."triggerEvent"
    `);
    await queryRunner.query(
      `ALTER TABLE "rules" ALTER COLUMN "triggerEventId" SET NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "rules" ADD CONSTRAINT "FK_rules_trigger_event"
      FOREIGN KEY ("triggerEventId") REFERENCES "business_events"("id")
      ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      CREATE TABLE "rule_expected_events" (
        "ruleId" uuid NOT NULL,
        "eventId" uuid NOT NULL,
        CONSTRAINT "PK_rule_expected_events" PRIMARY KEY ("ruleId", "eventId"),
        CONSTRAINT "FK_rule_expected_events_rule" FOREIGN KEY ("ruleId")
          REFERENCES "rules"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_rule_expected_events_event" FOREIGN KEY ("eventId")
          REFERENCES "business_events"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      INSERT INTO "rule_expected_events" ("ruleId", "eventId")
      SELECT rule."id", event."id"
      FROM "rules" rule
      CROSS JOIN LATERAL unnest(rule."expectedEvents") expected("name")
      JOIN "business_events" event ON event."name" = expected."name"
      ON CONFLICT DO NOTHING
    `);
    await queryRunner.query(
      `ALTER TABLE "workflows" ADD COLUMN "externalWorkflowId" uuid`,
    );
    await queryRunner.query(`
      UPDATE "workflows" workflow
      SET "externalWorkflowId" = external_workflow."id"
      FROM "external_workflows" external_workflow
      WHERE external_workflow."externalId" = workflow."externalId"
    `);
    await queryRunner.query(`
      ALTER TABLE "workflows" ADD CONSTRAINT "FK_workflows_external_workflow"
      FOREIGN KEY ("externalWorkflowId") REFERENCES "external_workflows"("id")
      ON DELETE SET NULL
    `);
    await queryRunner.query(`
      WITH ranked AS (
        SELECT "id",
               row_number() OVER (
                 PARTITION BY "ruleId", "externalWorkflowId"
                 ORDER BY "createdAt" DESC, "id" DESC
               ) AS position
        FROM "workflows"
        WHERE "status" = 'waiting' AND "externalWorkflowId" IS NOT NULL
      )
      UPDATE "workflows" workflow
      SET "status" = 'cancelled'
      FROM ranked
      WHERE workflow."id" = ranked."id" AND ranked.position > 1
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_waiting_rule_external_workflow"
      ON "workflows" ("ruleId", "externalWorkflowId")
      WHERE "status" = 'waiting' AND "externalWorkflowId" IS NOT NULL
    `);
    await queryRunner.query(`ALTER TABLE "rules" DROP COLUMN "triggerEvent"`);
    await queryRunner.query(`ALTER TABLE "rules" DROP COLUMN "expectedEvents"`);
    await queryRunner.query(`DROP TABLE "event_logs_legacy"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rules" ADD COLUMN "triggerEvent" varchar(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "rules" ADD COLUMN "expectedEvents" text[]`,
    );
    await queryRunner.query(`
      UPDATE "rules" rule SET
        "triggerEvent" = trigger_event."name",
        "expectedEvents" = COALESCE((
          SELECT array_agg(event."name" ORDER BY event."name")
          FROM "rule_expected_events" relation
          JOIN "business_events" event ON event."id" = relation."eventId"
          WHERE relation."ruleId" = rule."id"
        ), ARRAY[]::text[])
      FROM "business_events" trigger_event
      WHERE trigger_event."id" = rule."triggerEventId"
    `);
    await queryRunner.query(
      `ALTER TABLE "rules" ALTER COLUMN "triggerEvent" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rules" ALTER COLUMN "expectedEvents" SET NOT NULL`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_waiting_rule_external_workflow"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflows" DROP CONSTRAINT "FK_workflows_external_workflow"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflows" DROP COLUMN "externalWorkflowId"`,
    );
    await queryRunner.query(`DROP TABLE "rule_expected_events"`);
    await queryRunner.query(
      `ALTER TABLE "rules" DROP CONSTRAINT "FK_rules_trigger_event"`,
    );
    await queryRunner.query(`ALTER TABLE "rules" DROP COLUMN "triggerEventId"`);
    await queryRunner.query(
      `ALTER TABLE "business_events" RENAME TO "business_event_definitions"`,
    );
    await queryRunner.query(`
      CREATE TABLE "business_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "eventName" varchar(255) NOT NULL,
        "type" "public"."business_events_type_enum" NOT NULL DEFAULT 'business',
        "timestamp" timestamptz NOT NULL,
        "payload" jsonb,
        "externalWorkflowId" varchar(255),
        "workflowId" uuid,
        CONSTRAINT "PK_business_events" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      INSERT INTO "business_events" (
        "id", "createdAt", "updatedAt", "eventName", "type", "timestamp",
        "payload", "externalWorkflowId", "workflowId"
      )
      SELECT log."id", log."createdAt", log."updatedAt", event."name",
             event."type", log."timestamp", log."payload",
             external_workflow."externalId", NULL
      FROM "event_logs" log
      JOIN "business_event_definitions" event ON event."id" = log."eventId"
      LEFT JOIN "external_workflows" external_workflow
        ON external_workflow."id" = log."externalWorkflowRecordId"
    `);
    await queryRunner.query(`DROP TABLE "event_logs"`);
    await queryRunner.query(`DROP TABLE "external_workflows"`);
    await queryRunner.query(`DROP TABLE "business_event_definitions"`);
  }
}
