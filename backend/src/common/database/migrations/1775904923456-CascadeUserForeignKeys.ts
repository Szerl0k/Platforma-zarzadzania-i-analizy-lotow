import { MigrationInterface, QueryRunner } from "typeorm";

export class CascadeUserForeignKeys1775904923456 implements MigrationInterface {
  name = "CascadeUserForeignKeys1775904923456";

  private readonly fks: { table: string; constraint: string }[] = [
    { table: "user_preferences", constraint: "FK_458057fa75b66e68a275647da2e" },
    { table: "flight_history", constraint: "FK_fe02c6d48735ac70f387141e48a" },
    {
      table: "favorite_destinations",
      constraint: "FK_18815a2ad3a6975ca15094a625a",
    },
    {
      table: "custom_flight_simulations",
      constraint: "FK_d289daa10fd1fca2b28de589a45",
    },
    { table: "tracked_flights", constraint: "FK_4aa75c55679a368b613ae884bc1" },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const { table, constraint } of this.fks) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT "${constraint}"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "${constraint}" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const { table, constraint } of this.fks) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT "${constraint}"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "${constraint}" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      );
    }
  }
}
