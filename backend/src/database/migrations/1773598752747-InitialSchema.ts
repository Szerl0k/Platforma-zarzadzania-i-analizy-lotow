import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1773598752747 implements MigrationInterface {
    name = 'InitialSchema1773598752747'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "airports" ("icao_code" character varying(4) NOT NULL, "iata_code" character varying(3), "name" character varying NOT NULL, "city_id" integer NOT NULL, "location" geometry(Point,4326) NOT NULL, "timezone" character varying NOT NULL, CONSTRAINT "UQ_43224ff10f4d81b8b3b6e2fa238" UNIQUE ("iata_code"), CONSTRAINT "PK_079a6c622e92be45eaf512bdddb" PRIMARY KEY ("icao_code"))`);
        await queryRunner.query(`CREATE TABLE "cities" ("id" SERIAL NOT NULL, "country_code" character varying(2) NOT NULL, CONSTRAINT "PK_4762ffb6e5d198cfec5606bc11e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "countries" ("iso_code" character varying(2) NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_31d60a54633e88225b40081e187" PRIMARY KEY ("iso_code"))`);
        await queryRunner.query(`CREATE TABLE "airlines" ("icao_code" character varying(3) NOT NULL, "iata_code" character varying(2), "name" character varying NOT NULL, CONSTRAINT "UQ_5241e716bccc251c3b5b545de3f" UNIQUE ("iata_code"), CONSTRAINT "PK_b078c65c407acdc9279da78ca0e" PRIMARY KEY ("icao_code"))`);
        await queryRunner.query(`CREATE TABLE "flight_statuses" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "category" character varying, CONSTRAINT "UQ_5b7459ff61d27d3b36b63ecc2d6" UNIQUE ("name"), CONSTRAINT "PK_3ad3e5c1ffd76d242b06588c054" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "flight_codeshares" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "flight_id" uuid NOT NULL, "marketing_airline_icao" character varying(3), "marketing_ident_iata" character varying NOT NULL, "marketing_ident_icao" character varying, CONSTRAINT "UQ_65a8ad7fb18e1ebba5abc9b740d" UNIQUE ("flight_id", "marketing_ident_iata"), CONSTRAINT "PK_0e1b9202a4dbe7efcbe07f8efc3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "flight_telemetry" ("id" BIGSERIAL NOT NULL, "flight_id" uuid NOT NULL, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, "location" geometry(Point,4326) NOT NULL, "altitude" integer, "velocity" numeric(7,2), "heading" numeric(5,2), "on_ground" boolean NOT NULL, CONSTRAINT "PK_f983c2f5f7d6b376f082d374444" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9fc7a2aa3086fb64c01edf73ac" ON "flight_telemetry" ("flight_id", "timestamp") `);
        await queryRunner.query(`CREATE TABLE "flights" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ident_icao" character varying NOT NULL, "ident_iata" character varying, "operating_airline_icao" character varying(3) NOT NULL, "callsign" character varying NOT NULL, "origin_icao" character varying(4) NOT NULL, "destination_icao" character varying(4) NOT NULL, "status_id" integer NOT NULL, "terminal_origin" character varying(10), "gate_origin" character varying(10), "terminal_destination" character varying(10), "gate_destination" character varying(10), "departure_delay" integer, "arrival_delay" integer, "scheduled_out" TIMESTAMP WITH TIME ZONE NOT NULL, "estimated_out" TIMESTAMP WITH TIME ZONE, "actual_out" TIMESTAMP WITH TIME ZONE, "scheduled_in" TIMESTAMP WITH TIME ZONE NOT NULL, "estimated_in" TIMESTAMP WITH TIME ZONE, "actual_in" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_c614ef3382fdd70b6d6c2c8d8dd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "airports" ADD CONSTRAINT "FK_35db242a805855ae374834fd9f8" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cities" ADD CONSTRAINT "FK_36b7590678c98e71c292f338399" FOREIGN KEY ("country_code") REFERENCES "countries"("iso_code") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "flight_codeshares" ADD CONSTRAINT "FK_0f043f20dbe52d75203e9f94268" FOREIGN KEY ("flight_id") REFERENCES "flights"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "flight_codeshares" ADD CONSTRAINT "FK_f09b946e49a6d0dddd5141c3632" FOREIGN KEY ("marketing_airline_icao") REFERENCES "airlines"("icao_code") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "flight_telemetry" ADD CONSTRAINT "FK_d5db8249e99673955838f2bb818" FOREIGN KEY ("flight_id") REFERENCES "flights"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "flights" ADD CONSTRAINT "FK_90ecb5fe51f3e8f270d126c5aed" FOREIGN KEY ("operating_airline_icao") REFERENCES "airlines"("icao_code") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "flights" ADD CONSTRAINT "FK_f434d3da290ac8e5bab0f0f8c9b" FOREIGN KEY ("origin_icao") REFERENCES "airports"("icao_code") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "flights" ADD CONSTRAINT "FK_66789ae7bdf01144dd2ae8dc10a" FOREIGN KEY ("destination_icao") REFERENCES "airports"("icao_code") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "flights" ADD CONSTRAINT "FK_839e382e2d4794ca791771b6d66" FOREIGN KEY ("status_id") REFERENCES "flight_statuses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "flights" DROP CONSTRAINT "FK_839e382e2d4794ca791771b6d66"`);
        await queryRunner.query(`ALTER TABLE "flights" DROP CONSTRAINT "FK_66789ae7bdf01144dd2ae8dc10a"`);
        await queryRunner.query(`ALTER TABLE "flights" DROP CONSTRAINT "FK_f434d3da290ac8e5bab0f0f8c9b"`);
        await queryRunner.query(`ALTER TABLE "flights" DROP CONSTRAINT "FK_90ecb5fe51f3e8f270d126c5aed"`);
        await queryRunner.query(`ALTER TABLE "flight_telemetry" DROP CONSTRAINT "FK_d5db8249e99673955838f2bb818"`);
        await queryRunner.query(`ALTER TABLE "flight_codeshares" DROP CONSTRAINT "FK_f09b946e49a6d0dddd5141c3632"`);
        await queryRunner.query(`ALTER TABLE "flight_codeshares" DROP CONSTRAINT "FK_0f043f20dbe52d75203e9f94268"`);
        await queryRunner.query(`ALTER TABLE "cities" DROP CONSTRAINT "FK_36b7590678c98e71c292f338399"`);
        await queryRunner.query(`ALTER TABLE "airports" DROP CONSTRAINT "FK_35db242a805855ae374834fd9f8"`);
        await queryRunner.query(`DROP TABLE "flights"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9fc7a2aa3086fb64c01edf73ac"`);
        await queryRunner.query(`DROP TABLE "flight_telemetry"`);
        await queryRunner.query(`DROP TABLE "flight_codeshares"`);
        await queryRunner.query(`DROP TABLE "flight_statuses"`);
        await queryRunner.query(`DROP TABLE "airlines"`);
        await queryRunner.query(`DROP TABLE "countries"`);
        await queryRunner.query(`DROP TABLE "cities"`);
        await queryRunner.query(`DROP TABLE "airports"`);
    }

}
