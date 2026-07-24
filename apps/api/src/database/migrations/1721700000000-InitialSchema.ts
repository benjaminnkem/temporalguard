import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1721700000000 implements MigrationInterface {
  name = 'InitialSchema1721700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."business_events_type_enum"
      AS ENUM ('business', 'system')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."rules_operator_enum" AS ENUM ('any', 'all')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."rules_timeoutunit_enum"
      AS ENUM ('seconds', 'minutes', 'hours', 'days')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."rules_severity_enum"
      AS ENUM ('low', 'medium', 'high', 'critical')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."workflows_status_enum"
      AS ENUM ('waiting', 'completed', 'overdue', 'cancelled')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."violations_severity_enum"
      AS ENUM ('low', 'medium', 'high', 'critical')
    `);

    await queryRunner.query(`
      CREATE TABLE "rules" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "name" varchar(255) NOT NULL,
        "description" text,
        "triggerEvent" varchar(255) NOT NULL,
        "expectedEvents" text[] NOT NULL,
        "operator" "public"."rules_operator_enum" NOT NULL DEFAULT 'all',
        "timeoutValue" integer NOT NULL,
        "timeoutUnit" "public"."rules_timeoutunit_enum" NOT NULL DEFAULT 'minutes',
        "severity" "public"."rules_severity_enum" NOT NULL DEFAULT 'medium',
        "enabled" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_rules" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "workflows" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "externalId" varchar(255),
        "name" varchar(255),
        "status" "public"."workflows_status_enum" NOT NULL DEFAULT 'waiting',
        "deadline" timestamptz NOT NULL,
        "currentState" jsonb NOT NULL DEFAULT '{}',
        "metadata" jsonb,
        "ruleId" uuid NOT NULL,
        CONSTRAINT "PK_workflows" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workflows_rule" FOREIGN KEY ("ruleId")
          REFERENCES "rules"("id") ON DELETE CASCADE
      )
    `);
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
        CONSTRAINT "PK_business_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_business_events_workflow" FOREIGN KEY ("workflowId")
          REFERENCES "workflows"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "violations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "severity" "public"."violations_severity_enum" NOT NULL DEFAULT 'medium',
        "reason" text NOT NULL,
        "occurredAt" timestamptz NOT NULL DEFAULT now(),
        "details" jsonb,
        "workflowId" uuid NOT NULL,
        "ruleId" uuid NOT NULL,
        CONSTRAINT "PK_violations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_violations_workflow" FOREIGN KEY ("workflowId")
          REFERENCES "workflows"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_violations_rule" FOREIGN KEY ("ruleId")
          REFERENCES "rules"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "violations"`);
    await queryRunner.query(`DROP TABLE "business_events"`);
    await queryRunner.query(`DROP TABLE "workflows"`);
    await queryRunner.query(`DROP TABLE "rules"`);
    await queryRunner.query(`DROP TYPE "public"."violations_severity_enum"`);
    await queryRunner.query(`DROP TYPE "public"."workflows_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."rules_severity_enum"`);
    await queryRunner.query(`DROP TYPE "public"."rules_timeoutunit_enum"`);
    await queryRunner.query(`DROP TYPE "public"."rules_operator_enum"`);
    await queryRunner.query(`DROP TYPE "public"."business_events_type_enum"`);
  }
}
