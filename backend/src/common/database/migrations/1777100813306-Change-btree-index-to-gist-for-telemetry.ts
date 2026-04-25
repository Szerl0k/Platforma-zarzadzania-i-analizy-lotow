import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeBtreeIndexToGistForTelemetry1777100813306 implements MigrationInterface {
  name = "ChangeBtreeIndexToGistForTelemetry1777100813306";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_19aee178ec277f23f0cf59f69a"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_19aee178ec277f23f0cf59f69a" ON "flight_telemetry" USING GiST ("location") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_19aee178ec277f23f0cf59f69a"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_19aee178ec277f23f0cf59f69a" ON "flight_telemetry" ("location") `,
    );
  }
}
