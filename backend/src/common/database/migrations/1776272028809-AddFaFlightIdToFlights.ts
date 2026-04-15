import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFaFlightIdToFlights1776272028809 implements MigrationInterface {
    name = 'AddFaFlightIdToFlights1776272028809'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_preferences" DROP CONSTRAINT "FK_458057fa75b66e68a275647da2e"`);
        await queryRunner.query(`ALTER TABLE "tracked_flights" DROP CONSTRAINT "FK_4aa75c55679a368b613ae884bc1"`);
        await queryRunner.query(`ALTER TABLE "flight_history" DROP CONSTRAINT "FK_fe02c6d48735ac70f387141e48a"`);
        await queryRunner.query(`ALTER TABLE "favorite_destinations" DROP CONSTRAINT "FK_18815a2ad3a6975ca15094a625a"`);
        await queryRunner.query(`ALTER TABLE "custom_flight_simulations" DROP CONSTRAINT "FK_d289daa10fd1fca2b28de589a45"`);
        await queryRunner.query(`ALTER TABLE "flights" ADD "fa_flight_id" character varying`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bc7dda447c0365d52a5bff6e01" ON "flights" ("fa_flight_id") `);
        await queryRunner.query(`ALTER TABLE "user_preferences" ADD CONSTRAINT "FK_458057fa75b66e68a275647da2e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tracked_flights" ADD CONSTRAINT "FK_4aa75c55679a368b613ae884bc1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "flight_history" ADD CONSTRAINT "FK_fe02c6d48735ac70f387141e48a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "favorite_destinations" ADD CONSTRAINT "FK_18815a2ad3a6975ca15094a625a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "custom_flight_simulations" ADD CONSTRAINT "FK_d289daa10fd1fca2b28de589a45" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "custom_flight_simulations" DROP CONSTRAINT "FK_d289daa10fd1fca2b28de589a45"`);
        await queryRunner.query(`ALTER TABLE "favorite_destinations" DROP CONSTRAINT "FK_18815a2ad3a6975ca15094a625a"`);
        await queryRunner.query(`ALTER TABLE "flight_history" DROP CONSTRAINT "FK_fe02c6d48735ac70f387141e48a"`);
        await queryRunner.query(`ALTER TABLE "tracked_flights" DROP CONSTRAINT "FK_4aa75c55679a368b613ae884bc1"`);
        await queryRunner.query(`ALTER TABLE "user_preferences" DROP CONSTRAINT "FK_458057fa75b66e68a275647da2e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bc7dda447c0365d52a5bff6e01"`);
        await queryRunner.query(`ALTER TABLE "flights" DROP COLUMN "fa_flight_id"`);
        await queryRunner.query(`ALTER TABLE "custom_flight_simulations" ADD CONSTRAINT "FK_d289daa10fd1fca2b28de589a45" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "favorite_destinations" ADD CONSTRAINT "FK_18815a2ad3a6975ca15094a625a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "flight_history" ADD CONSTRAINT "FK_fe02c6d48735ac70f387141e48a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tracked_flights" ADD CONSTRAINT "FK_4aa75c55679a368b613ae884bc1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_preferences" ADD CONSTRAINT "FK_458057fa75b66e68a275647da2e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
