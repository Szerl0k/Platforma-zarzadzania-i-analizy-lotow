import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBlockedToUsers1778600000001 implements MigrationInterface {
  name = "AddBlockedToUsers1778600000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Admin account-blocking flag. Blocked users cannot log in or refresh their
    // session.
    await queryRunner.query(
      `ALTER TABLE "users" ADD "blocked" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "blocked"`);
  }
}
