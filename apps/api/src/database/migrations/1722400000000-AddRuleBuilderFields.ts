import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRuleBuilderFields1722400000000 implements MigrationInterface {
  name = 'AddRuleBuilderFields1722400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rules" ADD COLUMN "triggerFilters" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "rules" ADD COLUMN "correlationKey" varchar(255) NOT NULL DEFAULT 'workflow.id'`,
    );
    await queryRunner.query(
      `ALTER TABLE "rules" ADD COLUMN "environments" text[] NOT NULL DEFAULT ARRAY['production']::text[]`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "rules" DROP COLUMN "environments"`);
    await queryRunner.query(`ALTER TABLE "rules" DROP COLUMN "correlationKey"`);
    await queryRunner.query(`ALTER TABLE "rules" DROP COLUMN "triggerFilters"`);
  }
}
