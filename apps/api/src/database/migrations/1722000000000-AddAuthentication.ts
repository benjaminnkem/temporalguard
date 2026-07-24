import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthentication1722000000000 implements MigrationInterface {
  name = 'AddAuthentication1722000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "businesses" ADD COLUMN "logoUrl" varchar(2048)`,
    );
    await queryRunner.query(
      `ALTER TABLE "businesses" ADD COLUMN "logoPublicId" varchar(255)`,
    );
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "businessId" uuid NOT NULL,
        "firstName" varchar(120) NOT NULL,
        "lastName" varchar(120) NOT NULL,
        "email" varchar(320) NOT NULL,
        "passwordHash" varchar(255) NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'active',
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "FK_users_business" FOREIGN KEY ("businessId")
          REFERENCES "businesses"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_email_normalized" ON "users" (LOWER("email"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_business" ON "users" ("businessId")`,
    );
    await queryRunner.query(`
      CREATE TABLE "refresh_sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "userId" uuid NOT NULL,
        "familyId" uuid NOT NULL,
        "tokenHash" varchar(255) NOT NULL,
        "expiresAt" timestamptz NOT NULL,
        "revokedAt" timestamptz,
        "replacedById" uuid,
        "userAgent" varchar(512),
        "ipAddress" varchar(64),
        CONSTRAINT "PK_refresh_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_sessions_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_refresh_sessions_replacement" FOREIGN KEY ("replacedById")
          REFERENCES "refresh_sessions"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_sessions_user" ON "refresh_sessions" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_sessions_family" ON "refresh_sessions" ("familyId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_sessions_expires" ON "refresh_sessions" ("expiresAt")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_refresh_sessions_active_family"
      ON "refresh_sessions" ("familyId")
      WHERE "revokedAt" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_refresh_sessions_active_family"`);
    await queryRunner.query(`DROP INDEX "IDX_refresh_sessions_expires"`);
    await queryRunner.query(`DROP INDEX "IDX_refresh_sessions_family"`);
    await queryRunner.query(`DROP INDEX "IDX_refresh_sessions_user"`);
    await queryRunner.query(`DROP TABLE "refresh_sessions"`);
    await queryRunner.query(`DROP INDEX "IDX_users_business"`);
    await queryRunner.query(`DROP INDEX "UQ_users_email_normalized"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(
      `ALTER TABLE "businesses" DROP COLUMN "logoPublicId"`,
    );
    await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN "logoUrl"`);
  }
}
