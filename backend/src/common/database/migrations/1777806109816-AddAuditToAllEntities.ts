import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuditToAllEntities1777806109816 implements MigrationInterface {
  name = "AddAuditToAllEntities1777806109816";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "airports" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "airports" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "cities" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "cities" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "countries" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "countries" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "airlines" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "airlines" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_statuses" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_statuses" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_codeshares" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_codeshares" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_telemetry" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_telemetry" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "flights" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "flights" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "simulation_statuses" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "simulation_statuses" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_change_types" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_change_types" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "tracking_statuses" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "tracking_statuses" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "tracking_sources" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "tracking_sources" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "tracked_flights" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_status_changes" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "roles" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_preferences" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_preferences" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_preferences" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_preferences" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "updated_at"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "tracked_flights" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tracked_flights" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_status_changes" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_status_changes" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_history" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_history" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_history" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_history" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorite_destinations" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorite_destinations" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorite_destinations" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorite_destinations" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_flight_simulations" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_flight_simulations" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_flight_simulations" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_flight_simulations" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "custom_flight_simulations" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_flight_simulations" ADD "updated_at" TIMESTAMP(0) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_flight_simulations" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_flight_simulations" ADD "created_at" TIMESTAMP(0) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorite_destinations" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorite_destinations" ADD "updated_at" TIMESTAMP(0) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorite_destinations" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorite_destinations" ADD "created_at" TIMESTAMP(0) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_history" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_history" ADD "updated_at" TIMESTAMP(0) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_history" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_history" ADD "created_at" TIMESTAMP(0) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD "created_at" TIMESTAMP(0) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_status_changes" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_status_changes" ADD "created_at" TIMESTAMP(0) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "tracked_flights" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tracked_flights" ADD "created_at" TIMESTAMP(0) NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "updated_at"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "updated_at" TIMESTAMP(0) NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "created_at" TIMESTAMP(0) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_preferences" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_preferences" ADD "updated_at" TIMESTAMP(0) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_preferences" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_preferences" ADD "created_at" TIMESTAMP(0) NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "roles" ADD "created_at" TIMESTAMP(0) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_status_changes" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tracked_flights" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tracking_sources" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tracking_sources" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tracking_statuses" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tracking_statuses" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "updated_at"`);
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_change_types" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_change_types" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "simulation_statuses" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "simulation_statuses" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(`ALTER TABLE "flights" DROP COLUMN "updated_at"`);
    await queryRunner.query(`ALTER TABLE "flights" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "flight_telemetry" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_telemetry" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_codeshares" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_codeshares" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_statuses" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flight_statuses" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(`ALTER TABLE "airlines" DROP COLUMN "updated_at"`);
    await queryRunner.query(`ALTER TABLE "airlines" DROP COLUMN "created_at"`);
    await queryRunner.query(`ALTER TABLE "countries" DROP COLUMN "updated_at"`);
    await queryRunner.query(`ALTER TABLE "countries" DROP COLUMN "created_at"`);
    await queryRunner.query(`ALTER TABLE "cities" DROP COLUMN "updated_at"`);
    await queryRunner.query(`ALTER TABLE "cities" DROP COLUMN "created_at"`);
    await queryRunner.query(`ALTER TABLE "airports" DROP COLUMN "updated_at"`);
    await queryRunner.query(`ALTER TABLE "airports" DROP COLUMN "created_at"`);
  }
}
