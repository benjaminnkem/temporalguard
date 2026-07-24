import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendRuleOperators1722100000000 implements MigrationInterface {
  name = 'ExtendRuleOperators1722100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."rules_operator_enum" ADD VALUE IF NOT EXISTS 'sequence'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."rules_operator_enum" ADD VALUE IF NOT EXISTS 'forbid'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rules" ALTER COLUMN "operator" DROP DEFAULT`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."rules_operator_enum_previous" AS ENUM ('any', 'all')`,
    );
    await queryRunner.query(
      `ALTER TABLE "rules" ALTER COLUMN "operator" TYPE "public"."rules_operator_enum_previous" USING (CASE WHEN "operator"::text IN ('sequence', 'forbid') THEN 'all' ELSE "operator"::text END)::"public"."rules_operator_enum_previous"`,
    );
    await queryRunner.query(`DROP TYPE "public"."rules_operator_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."rules_operator_enum_previous" RENAME TO "rules_operator_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rules" ALTER COLUMN "operator" SET DEFAULT 'all'`,
    );
  }
}
