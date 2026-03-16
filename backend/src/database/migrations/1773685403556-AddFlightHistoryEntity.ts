import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFlightHistoryEntity1773685403556 implements MigrationInterface {
    name = 'AddFlightHistoryEntity1773685403556'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "flight_history" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "travel_date" date NOT NULL,
                "seat_number" varchar(10) NULL,
                "booking_reference" varchar(20) NULL,
                "cabin_class" integer NULL,
                "notes" text NULL,
                "was_delayed" boolean NULL,
                "delay_minutes" integer NULL,
                "user_rating" decimal(2,1) NULL,
                "created_at" timestamp(0) NOT NULL DEFAULT now(),
                "updated_at" timestamp(0) NOT NULL DEFAULT now(),
                CONSTRAINT "flight_history_pk" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_flight_history_user_id_travel_date"
            ON "flight_history" ("user_id", "travel_date" DESC)
        `);

        await queryRunner.query(`
            ALTER TABLE "flight_history"
            ADD CONSTRAINT "flight_history_user_id_foreign"
            FOREIGN KEY ("user_id") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "flight_history" DROP CONSTRAINT "flight_history_user_id_foreign"`);
        await queryRunner.query(`DROP INDEX "IDX_flight_history_user_id_travel_date"`);
        await queryRunner.query(`DROP TABLE "flight_history"`);
    }
}
