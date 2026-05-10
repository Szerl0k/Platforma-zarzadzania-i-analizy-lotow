import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTrackingNotifications1778500000000 implements MigrationInterface {
  name = "AddTrackingNotifications1778500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. tracked_flights: throttling timestamp + partial unique index
    await queryRunner.query(
      `ALTER TABLE "tracked_flights" ADD "last_notified_at" TIMESTAMP WITH TIME ZONE NULL`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_tracked_flights_active_user_flight"
       ON "tracked_flights" ("user_id", "flight_id")
       WHERE "stopped_tracking_at" IS NULL`,
    );

    // 2. Extra tracking sources (idempotent — ON CONFLICT)
    await queryRunner.query(
      `INSERT INTO "tracking_sources" ("name") VALUES
         ('flight_number'),
         ('map_click')
       ON CONFLICT ("name") DO NOTHING`,
    );

    // 3. flight_history: optional FK to flights for dedup + reporting
    await queryRunner.query(
      `ALTER TABLE "flight_history" ADD "flight_id" uuid NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "flight_history"
       ADD CONSTRAINT "flight_history_flight_id_foreign"
       FOREIGN KEY ("flight_id") REFERENCES "flights"("id")
       ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_flight_history_user_flight"
       ON "flight_history" ("user_id", "flight_id")
       WHERE "flight_id" IS NOT NULL`,
    );

    // 4. notification_logs: in-app notifications (toast / bell dropdown)
    await queryRunner.query(`
      CREATE TABLE "notification_logs" (
        "id"                       uuid                     NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"                  uuid                     NOT NULL,
        "tracked_flight_id"        uuid                     NULL,
        "flight_status_change_id"  uuid                     NULL,
        "type"                     varchar(50)              NOT NULL,
        "title"                    varchar(255)             NOT NULL,
        "body"                     text                     NOT NULL,
        "link"                     varchar(255)             NULL,
        "read_at"                  timestamp with time zone NULL,
        "created_at"               timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at"               timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "notification_logs_pk" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_notification_logs_user_id_read_at"
       ON "notification_logs" ("user_id", "read_at", "created_at" DESC)`,
    );

    await queryRunner.query(
      `ALTER TABLE "notification_logs"
       ADD CONSTRAINT "notification_logs_user_id_foreign"
       FOREIGN KEY ("user_id") REFERENCES "users"("id")
       ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "notification_logs"
       ADD CONSTRAINT "notification_logs_tracked_flight_id_foreign"
       FOREIGN KEY ("tracked_flight_id") REFERENCES "tracked_flights"("id")
       ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "notification_logs"
       ADD CONSTRAINT "notification_logs_flight_status_change_id_foreign"
       FOREIGN KEY ("flight_status_change_id") REFERENCES "flight_status_changes"("id")
       ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_logs" DROP CONSTRAINT "notification_logs_flight_status_change_id_foreign"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_logs" DROP CONSTRAINT "notification_logs_tracked_flight_id_foreign"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_logs" DROP CONSTRAINT "notification_logs_user_id_foreign"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_notification_logs_user_id_read_at"`,
    );
    await queryRunner.query(`DROP TABLE "notification_logs"`);

    await queryRunner.query(`DROP INDEX "UQ_flight_history_user_flight"`);
    await queryRunner.query(
      `ALTER TABLE "flight_history" DROP CONSTRAINT "flight_history_flight_id_foreign"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_history" DROP COLUMN "flight_id"`,
    );

    await queryRunner.query(
      `DELETE FROM "tracking_sources" WHERE "name" IN ('flight_number', 'map_click')`,
    );

    await queryRunner.query(
      `DROP INDEX "UQ_tracked_flights_active_user_flight"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tracked_flights" DROP COLUMN "last_notified_at"`,
    );
  }
}
