import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDurableProcessing1722600000000 implements MigrationInterface {
  name = 'AddDurableProcessing1722600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "processing_status_enum" AS ENUM (
        'pending', 'queued', 'running', 'waiting_for_telemetry',
        'completed', 'completed_with_gaps', 'failed', 'cancelled', 'dead_letter'
      )
    `);
    await queryRunner.query(
      `CREATE TYPE "signoz_mode_enum" AS ENUM ('self_hosted', 'cloud')`,
    );
    await queryRunner.query(`
      CREATE TABLE "signoz_connections" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "businessId" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "mode" "signoz_mode_enum" NOT NULL,
        "name" varchar(120) NOT NULL,
        "apiUrl" varchar(2048) NOT NULL,
        "uiUrl" varchar(2048) NOT NULL,
        "encryptedApiKey" text NOT NULL,
        "ingestionEndpoint" varchar(2048),
        "status" varchar(32) NOT NULL DEFAULT 'unverified',
        "lastValidatedAt" timestamptz,
        "lastValidationErrorCode" varchar(120),
        "createdBy" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "UQ_signoz_connections_company_name" UNIQUE ("businessId", "name")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "investigations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "businessId" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "violationId" uuid NOT NULL REFERENCES "violations"("id") ON DELETE CASCADE,
        "workflowId" uuid NOT NULL REFERENCES "workflows"("id") ON DELETE CASCADE,
        "ruleId" uuid NOT NULL REFERENCES "rules"("id") ON DELETE RESTRICT,
        "status" "processing_status_enum" NOT NULL DEFAULT 'pending',
        "trigger" varchar(64) NOT NULL,
        "configurationHash" varchar(64) NOT NULL,
        "requestedBy" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "startedAt" timestamptz,
        "completedAt" timestamptz,
        "cancelledAt" timestamptz,
        "cancellationRequestedAt" timestamptz,
        "confidence" varchar(16),
        "summary" text,
        "topContributor" varchar(255),
        "dataGapCount" integer NOT NULL DEFAULT 0 CHECK ("dataGapCount" >= 0),
        "evidenceCount" integer NOT NULL DEFAULT 0 CHECK ("evidenceCount" >= 0),
        "errorCode" varchar(120),
        "errorMessage" text,
        CONSTRAINT "UQ_investigations_company_config"
          UNIQUE ("businessId", "violationId", "configurationHash")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "investigation_steps" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "investigationId" uuid NOT NULL REFERENCES "investigations"("id") ON DELETE CASCADE,
        "sequence" integer NOT NULL CHECK ("sequence" >= 0),
        "type" varchar(64) NOT NULL,
        "name" varchar(160) NOT NULL,
        "status" "processing_status_enum" NOT NULL,
        "inputRedacted" jsonb,
        "outputSummary" jsonb,
        "startedAt" timestamptz,
        "completedAt" timestamptz,
        "errorCode" varchar(120),
        CONSTRAINT "UQ_investigation_steps_sequence" UNIQUE ("investigationId", "sequence")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "evidence" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "businessId" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "investigationId" uuid NOT NULL REFERENCES "investigations"("id") ON DELETE CASCADE,
        "type" varchar(48) NOT NULL,
        "signal" varchar(32) NOT NULL,
        "sourceSystem" varchar(64) NOT NULL,
        "queryId" varchar(120),
        "title" varchar(255) NOT NULL,
        "summary" text NOT NULL,
        "timeRangeStart" timestamptz NOT NULL,
        "timeRangeEnd" timestamptz NOT NULL,
        "serviceName" varchar(255),
        "serviceVersion" varchar(255),
        "traceId" varchar(32),
        "spanId" varchar(16),
        "measuredValue" double precision,
        "unit" varchar(32),
        "confidence" double precision CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 1)),
        "reference" varchar(2048),
        "redactedSnapshot" jsonb,
        CHECK ("timeRangeEnd" >= "timeRangeStart")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "agent_runs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "investigationId" uuid NOT NULL REFERENCES "investigations"("id") ON DELETE CASCADE,
        "provider" varchar(64) NOT NULL,
        "model" varchar(120) NOT NULL,
        "policyVersion" varchar(64) NOT NULL,
        "maxSteps" integer NOT NULL CHECK ("maxSteps" > 0),
        "status" "processing_status_enum" NOT NULL,
        "inputTokenCount" integer CHECK ("inputTokenCount" IS NULL OR "inputTokenCount" >= 0),
        "outputTokenCount" integer CHECK ("outputTokenCount" IS NULL OR "outputTokenCount" >= 0),
        "startedAt" timestamptz,
        "completedAt" timestamptz,
        "errorCode" varchar(120)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "agent_tool_calls" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "agentRunId" uuid NOT NULL REFERENCES "agent_runs"("id") ON DELETE CASCADE,
        "sequence" integer NOT NULL CHECK ("sequence" >= 0),
        "toolName" varchar(120) NOT NULL,
        "inputRedacted" jsonb,
        "outputEvidenceIds" uuid[] NOT NULL DEFAULT '{}',
        "status" "processing_status_enum" NOT NULL,
        "durationMs" integer CHECK ("durationMs" IS NULL OR "durationMs" >= 0),
        "errorCode" varchar(120),
        CONSTRAINT "UQ_agent_tool_calls_sequence" UNIQUE ("agentRunId", "sequence")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "workflow_comparisons" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "businessId" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "status" "processing_status_enum" NOT NULL DEFAULT 'pending',
        "requestedBy" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "startedAt" timestamptz,
        "completedAt" timestamptz,
        "cancellationRequestedAt" timestamptz,
        "errorCode" varchar(120),
        "name" varchar(255) NOT NULL,
        "configurationHash" varchar(64) NOT NULL,
        "configuration" jsonb NOT NULL,
        "cohortASize" integer NOT NULL DEFAULT 0 CHECK ("cohortASize" >= 0),
        "cohortBSize" integer NOT NULL DEFAULT 0 CHECK ("cohortBSize" >= 0),
        "resultSummary" jsonb,
        CONSTRAINT "UQ_comparisons_company_config" UNIQUE ("businessId", "configurationHash")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "rule_simulations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "businessId" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "status" "processing_status_enum" NOT NULL DEFAULT 'pending',
        "requestedBy" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "startedAt" timestamptz,
        "completedAt" timestamptz,
        "cancellationRequestedAt" timestamptz,
        "errorCode" varchar(120),
        "ruleId" uuid REFERENCES "rules"("id") ON DELETE SET NULL,
        "draftSnapshot" jsonb NOT NULL,
        "draftHash" varchar(64) NOT NULL,
        "from" timestamptz NOT NULL,
        "to" timestamptz NOT NULL,
        "workflowsEvaluated" integer NOT NULL DEFAULT 0 CHECK ("workflowsEvaluated" >= 0),
        "wouldComplete" integer NOT NULL DEFAULT 0 CHECK ("wouldComplete" >= 0),
        "wouldViolate" integer NOT NULL DEFAULT 0 CHECK ("wouldViolate" >= 0),
        "wouldCompleteLate" integer NOT NULL DEFAULT 0 CHECK ("wouldCompleteLate" >= 0),
        "result" jsonb,
        CONSTRAINT "UQ_simulations_company_hash_range" UNIQUE ("businessId", "draftHash", "from", "to"),
        CHECK ("to" > "from")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "deployment_observations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "businessId" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "serviceName" varchar(255) NOT NULL,
        "environment" varchar(120) NOT NULL,
        "version" varchar(255) NOT NULL,
        "firstObservedAt" timestamptz NOT NULL,
        "lastObservedAt" timestamptz NOT NULL,
        "source" varchar(64) NOT NULL,
        CONSTRAINT "UQ_deployments_company_service_env_version"
          UNIQUE ("businessId", "serviceName", "environment", "version"),
        CHECK ("lastObservedAt" >= "firstObservedAt")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "telemetry_quality_snapshots" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "businessId" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "scopeType" varchar(32) NOT NULL,
        "scopeKey" varchar(255) NOT NULL,
        "from" timestamptz NOT NULL,
        "to" timestamptz NOT NULL,
        "score" double precision NOT NULL CHECK ("score" >= 0 AND "score" <= 100),
        "dimensions" jsonb NOT NULL,
        "criticalGaps" jsonb NOT NULL DEFAULT '[]',
        CHECK ("to" > "from")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "businessId" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "actorId" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "action" varchar(120) NOT NULL,
        "entityType" varchar(64) NOT NULL,
        "entityId" uuid,
        "metadata" jsonb
      )
    `);

    const indexes = [
      `CREATE INDEX "IDX_signoz_connections_company_updated" ON "signoz_connections" ("businessId", "updatedAt")`,
      `CREATE INDEX "IDX_investigations_company_created" ON "investigations" ("businessId", "createdAt" DESC, "id" DESC)`,
      `CREATE INDEX "IDX_investigations_company_status" ON "investigations" ("businessId", "status")`,
      `CREATE INDEX "IDX_investigations_violation" ON "investigations" ("violationId")`,
      `CREATE INDEX "IDX_investigation_steps_investigation_status" ON "investigation_steps" ("investigationId", "status")`,
      `CREATE INDEX "IDX_evidence_company_created" ON "evidence" ("businessId", "createdAt" DESC, "id" DESC)`,
      `CREATE INDEX "IDX_evidence_investigation_signal" ON "evidence" ("investigationId", "signal")`,
      `CREATE INDEX "IDX_evidence_trace" ON "evidence" ("traceId") WHERE "traceId" IS NOT NULL`,
      `CREATE INDEX "IDX_agent_runs_investigation_created" ON "agent_runs" ("investigationId", "createdAt")`,
      `CREATE INDEX "IDX_agent_tool_calls_run_status" ON "agent_tool_calls" ("agentRunId", "status")`,
      `CREATE INDEX "IDX_comparisons_company_created" ON "workflow_comparisons" ("businessId", "createdAt" DESC, "id" DESC)`,
      `CREATE INDEX "IDX_comparisons_company_status" ON "workflow_comparisons" ("businessId", "status")`,
      `CREATE INDEX "IDX_simulations_company_created" ON "rule_simulations" ("businessId", "createdAt" DESC, "id" DESC)`,
      `CREATE INDEX "IDX_simulations_company_status" ON "rule_simulations" ("businessId", "status")`,
      `CREATE INDEX "IDX_deployments_company_observed" ON "deployment_observations" ("businessId", "firstObservedAt" DESC, "id" DESC)`,
      `CREATE INDEX "IDX_quality_company_created" ON "telemetry_quality_snapshots" ("businessId", "createdAt" DESC, "id" DESC)`,
      `CREATE INDEX "IDX_quality_company_scope_time" ON "telemetry_quality_snapshots" ("businessId", "scopeType", "scopeKey", "to" DESC)`,
      `CREATE INDEX "IDX_audit_logs_company_created" ON "audit_logs" ("businessId", "createdAt" DESC, "id" DESC)`,
      `CREATE INDEX "IDX_audit_logs_entity" ON "audit_logs" ("entityType", "entityId")`,
    ];
    for (const index of indexes) await queryRunner.query(index);
    await queryRunner.query(`
      CREATE FUNCTION "prevent_audit_log_mutation"() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'audit logs are append-only';
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "TR_audit_logs_append_only"
      BEFORE UPDATE OR DELETE ON "audit_logs"
      FOR EACH ROW EXECUTE FUNCTION "prevent_audit_log_mutation"()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'audit_logs',
      'telemetry_quality_snapshots',
      'deployment_observations',
      'rule_simulations',
      'workflow_comparisons',
      'agent_tool_calls',
      'agent_runs',
      'evidence',
      'investigation_steps',
      'investigations',
      'signoz_connections',
    ]) {
      if (table === 'audit_logs') {
        await queryRunner.query(
          `DROP TRIGGER "TR_audit_logs_append_only" ON "audit_logs"`,
        );
      }
      await queryRunner.query(`DROP TABLE "${table}"`);
    }
    await queryRunner.query(`DROP FUNCTION "prevent_audit_log_mutation"`);
    await queryRunner.query(`DROP TYPE "signoz_mode_enum"`);
    await queryRunner.query(`DROP TYPE "processing_status_enum"`);
  }
}
