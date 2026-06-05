import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFlownToFlightHistory1778600000000 implements MigrationInterface {
  name = "AddFlownToFlightHistory1778600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // User-facing "I actually flew this" flag. Archived history rows default to
    // false until the user confirms.
    await queryRunner.query(
      `ALTER TABLE "flight_history" ADD "flown" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "flight_history" DROP COLUMN "flown"`);
  }
}
