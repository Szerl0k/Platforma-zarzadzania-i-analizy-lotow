import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTrackedFlightsEntity1773687649880 implements MigrationInterface {
    name = 'AddTrackedFlightsEntity1773687649880'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "tracking_statuses" (
                "id"   serial      NOT NULL,
                "name" varchar(50) NOT NULL,
                CONSTRAINT "tracking_statuses_name_unique" UNIQUE ("name"),
                CONSTRAINT "tracking_statuses_pk" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            INSERT INTO "tracking_statuses" ("name") VALUES
                ('active'),
                ('stopped'),
                ('completed')
        `);

        await queryRunner.query(`
            CREATE TABLE "tracking_sources" (
                "id"   serial      NOT NULL,
                "name" varchar(50) NOT NULL,
                CONSTRAINT "tracking_sources_name_unique" UNIQUE ("name"),
                CONSTRAINT "tracking_sources_pk" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            INSERT INTO "tracking_sources" ("name") VALUES
                ('manual'),
                ('opensky'),
                ('aeroapi')
        `);

        await queryRunner.query(`
            CREATE TABLE "tracked_flights" (
                "id"                  uuid         NOT NULL DEFAULT uuid_generate_v4(),
                "user_id"             uuid         NOT NULL,
                "flight_id"           uuid         NOT NULL,
                "tracking_status_id"  integer      NOT NULL,
                "source_id"           integer      NOT NULL,
                "started_tracking_at" timestamp(0) NOT NULL DEFAULT now(),
                "stopped_tracking_at" timestamp(0) NULL,
                "created_at"          timestamp(0) NOT NULL DEFAULT now(),
                CONSTRAINT "tracked_flights_user_id_flight_id_started_tracking_at_unique"
                    UNIQUE ("user_id", "flight_id", "started_tracking_at"),
                CONSTRAINT "tracked_flights_pk" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            ALTER TABLE "tracked_flights"
            ADD CONSTRAINT "tracked_flights_user_id_foreign"
            FOREIGN KEY ("user_id") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "tracked_flights"
            ADD CONSTRAINT "tracked_flights_flight_id_foreign"
            FOREIGN KEY ("flight_id") REFERENCES "flights"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "tracked_flights"
            ADD CONSTRAINT "tracked_flights_tracking_status_id_foreign"
            FOREIGN KEY ("tracking_status_id") REFERENCES "tracking_statuses"("id")
            ON DELETE RESTRICT ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "tracked_flights"
            ADD CONSTRAINT "tracked_flights_source_id_foreign"
            FOREIGN KEY ("source_id") REFERENCES "tracking_sources"("id")
            ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tracked_flights" DROP CONSTRAINT "tracked_flights_source_id_foreign"`);
        await queryRunner.query(`ALTER TABLE "tracked_flights" DROP CONSTRAINT "tracked_flights_tracking_status_id_foreign"`);
        await queryRunner.query(`ALTER TABLE "tracked_flights" DROP CONSTRAINT "tracked_flights_flight_id_foreign"`);
        await queryRunner.query(`ALTER TABLE "tracked_flights" DROP CONSTRAINT "tracked_flights_user_id_foreign"`);
        await queryRunner.query(`DROP TABLE "tracked_flights"`);
        await queryRunner.query(`DROP TABLE "tracking_sources"`);
        await queryRunner.query(`DROP TABLE "tracking_statuses"`);
    }
}
