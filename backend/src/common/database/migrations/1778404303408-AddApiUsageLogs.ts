import { MigrationInterface, QueryRunner } from "typeorm";

export class AddApiUsageLogs1778404303408 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "api_usage_logs" (
        "id" bigserial NOT NULL,
        "provider" character varying(16) NOT NULL,
        "endpoint" character varying(255) NOT NULL,
        "status_code" integer,
        "success" boolean NOT NULL,
        "duration_ms" integer NOT NULL,
        "called_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_api_usage_logs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_api_usage_provider_called_at"
      ON "api_usage_logs" ("provider", "called_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_api_usage_provider_called_at"`);
    await queryRunner.query(`DROP TABLE "api_usage_logs"`);
  }
}
