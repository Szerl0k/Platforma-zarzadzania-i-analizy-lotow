import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCustomFlightSimulationsEntity1773687239086 implements MigrationInterface {
    name = 'AddCustomFlightSimulationsEntity1773687239086'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "simulation_statuses" (
                "id"   serial       NOT NULL,
                "name" varchar(50)  NOT NULL,
                CONSTRAINT "simulation_statuses_name_unique" UNIQUE ("name"),
                CONSTRAINT "simulation_statuses_pk" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            INSERT INTO "simulation_statuses" ("name") VALUES
                ('draft'),
                ('running'),
                ('completed'),
                ('cancelled')
        `);

        await queryRunner.query(`
            CREATE TABLE "custom_flight_simulations" (
                "id"                     uuid          NOT NULL DEFAULT uuid_generate_v4(),
                "user_id"                uuid          NOT NULL,
                "name"                   varchar(200)  NOT NULL,
                "departure_airport_icao" varchar(4)    NOT NULL,
                "arrival_airport_icao"   varchar(4)    NOT NULL,
                "aircraft_type"          varchar(10)   NULL,
                "simulation_start_time"  timestamp(0)  NOT NULL,
                "estimated_duration"     integer       NULL,
                "estimated_distance_km"  decimal(10,2) NULL,
                "cruise_altitude"        decimal(10,2) NULL,
                "cruise_speed"           decimal(10,2) NULL,
                "route_waypoints"        jsonb         NULL,
                "simulation_speed"       decimal(4,2)  NOT NULL DEFAULT 1,
                "status_id"              integer       NOT NULL,
                "share_token"            varchar(64)   NULL,
                "is_public"              boolean       NOT NULL DEFAULT false,
                "created_at"             timestamp(0)  NOT NULL DEFAULT now(),
                "updated_at"             timestamp(0)  NOT NULL DEFAULT now(),
                CONSTRAINT "custom_flight_simulations_share_token_unique" UNIQUE ("share_token"),
                CONSTRAINT "custom_flight_simulations_pk" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            ALTER TABLE "custom_flight_simulations"
            ADD CONSTRAINT "custom_flight_simulations_user_id_foreign"
            FOREIGN KEY ("user_id") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "custom_flight_simulations"
            ADD CONSTRAINT "custom_flight_simulations_departure_airport_icao_foreign"
            FOREIGN KEY ("departure_airport_icao") REFERENCES "airports"("icao_code")
            ON DELETE RESTRICT ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "custom_flight_simulations"
            ADD CONSTRAINT "custom_flight_simulations_arrival_airport_icao_foreign"
            FOREIGN KEY ("arrival_airport_icao") REFERENCES "airports"("icao_code")
            ON DELETE RESTRICT ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "custom_flight_simulations"
            ADD CONSTRAINT "custom_flight_simulations_status_id_foreign"
            FOREIGN KEY ("status_id") REFERENCES "simulation_statuses"("id")
            ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "custom_flight_simulations" DROP CONSTRAINT "custom_flight_simulations_status_id_foreign"`);
        await queryRunner.query(`ALTER TABLE "custom_flight_simulations" DROP CONSTRAINT "custom_flight_simulations_arrival_airport_icao_foreign"`);
        await queryRunner.query(`ALTER TABLE "custom_flight_simulations" DROP CONSTRAINT "custom_flight_simulations_departure_airport_icao_foreign"`);
        await queryRunner.query(`ALTER TABLE "custom_flight_simulations" DROP CONSTRAINT "custom_flight_simulations_user_id_foreign"`);
        await queryRunner.query(`DROP TABLE "custom_flight_simulations"`);
        await queryRunner.query(`DROP TABLE "simulation_statuses"`);
    }
}
