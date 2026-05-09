import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAirportRoutesTable1778290000000 implements MigrationInterface {
  name = "AddAirportRoutesTable1778290000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "airport_routes" (
        "id" SERIAL NOT NULL,
        "origin_airport_code" character varying(4) NOT NULL,
        "airline_code" character varying(3) NOT NULL,
        "destination_airport_code" character varying(4) NOT NULL,
        "fetched_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "uq_airport_routes_origin_airline_dest" UNIQUE ("origin_airport_code", "airline_code", "destination_airport_code"),
        CONSTRAINT "pk_airport_routes" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "airport_routes"
        ADD CONSTRAINT "fk_airport_routes_origin"
        FOREIGN KEY ("origin_airport_code")
        REFERENCES "airports"("icao_code")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "airport_routes"
        ADD CONSTRAINT "fk_airport_routes_airline"
        FOREIGN KEY ("airline_code")
        REFERENCES "airlines"("icao_code")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "airport_routes"
        ADD CONSTRAINT "fk_airport_routes_destination"
        FOREIGN KEY ("destination_airport_code")
        REFERENCES "airports"("icao_code")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_airport_routes_origin_fetched"
        ON "airport_routes" ("origin_airport_code", "fetched_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "idx_airport_routes_origin_fetched"`,
    );
    await queryRunner.query(
      `ALTER TABLE "airport_routes" DROP CONSTRAINT "fk_airport_routes_destination"`,
    );
    await queryRunner.query(
      `ALTER TABLE "airport_routes" DROP CONSTRAINT "fk_airport_routes_airline"`,
    );
    await queryRunner.query(
      `ALTER TABLE "airport_routes" DROP CONSTRAINT "fk_airport_routes_origin"`,
    );
    await queryRunner.query(`DROP TABLE "airport_routes"`);
  }
}
