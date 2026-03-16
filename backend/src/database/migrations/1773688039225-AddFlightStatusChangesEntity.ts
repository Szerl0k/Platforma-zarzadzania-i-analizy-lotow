import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFlightStatusChangesEntity1773688039225 implements MigrationInterface {
    name = 'AddFlightStatusChangesEntity1773688039225'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "flight_change_types" (
                "id"   serial      NOT NULL,
                "name" varchar(50) NOT NULL,
                CONSTRAINT "flight_change_types_name_unique" UNIQUE ("name"),
                CONSTRAINT "flight_change_types_pk" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            INSERT INTO "flight_change_types" ("name") VALUES
                ('status_change'),
                ('delay_update'),
                ('gate_change'),
                ('terminal_change'),
                ('cancellation'),
                ('diversion')
        `);

        await queryRunner.query(`
            CREATE TABLE "flight_status_changes" (
                "id"                uuid         NOT NULL DEFAULT uuid_generate_v4(),
                "tracked_flight_id" uuid         NOT NULL,
                "change_type_id"    integer      NOT NULL,
                "old_value"         jsonb        NULL,
                "new_value"         jsonb        NULL,
                "description"       text         NULL,
                "occurred_at"       timestamp(0) NOT NULL,
                "notification_sent" boolean      NOT NULL DEFAULT false,
                "created_at"        timestamp(0) NOT NULL DEFAULT now(),
                CONSTRAINT "flight_status_changes_pk" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_flight_status_changes_tracked_flight_id_occurred_at"
            ON "flight_status_changes" ("tracked_flight_id", "occurred_at" DESC)
        `);

        await queryRunner.query(`
            ALTER TABLE "flight_status_changes"
            ADD CONSTRAINT "flight_status_changes_tracked_flight_id_foreign"
            FOREIGN KEY ("tracked_flight_id") REFERENCES "tracked_flights"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "flight_status_changes"
            ADD CONSTRAINT "flight_status_changes_change_type_id_foreign"
            FOREIGN KEY ("change_type_id") REFERENCES "flight_change_types"("id")
            ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "flight_status_changes" DROP CONSTRAINT "flight_status_changes_change_type_id_foreign"`);
        await queryRunner.query(`ALTER TABLE "flight_status_changes" DROP CONSTRAINT "flight_status_changes_tracked_flight_id_foreign"`);
        await queryRunner.query(`DROP INDEX "IDX_flight_status_changes_tracked_flight_id_occurred_at"`);
        await queryRunner.query(`DROP TABLE "flight_status_changes"`);
        await queryRunner.query(`DROP TABLE "flight_change_types"`);
    }
}
