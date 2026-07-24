import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRuleSoftDelete1722300000000 implements MigrationInterface {
  name = 'AddRuleSoftDelete1722300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rules" ADD COLUMN "deletedAt" timestamptz`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rules_business_enabled_not_deleted" ON "rules" ("businessId", "enabled") WHERE "deletedAt" IS NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_rules_business_enabled_not_deleted"`,
    );
    await queryRunner.query(`ALTER TABLE "rules" DROP COLUMN "deletedAt"`);
  }
}
