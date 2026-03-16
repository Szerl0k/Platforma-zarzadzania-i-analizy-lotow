import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFavouriteDestinationsEntity1773686412777 implements MigrationInterface {
    name = 'AddFavouriteDestinationsEntity1773686412777'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "favorite_destinations" (
                "id"           uuid         NOT NULL DEFAULT uuid_generate_v4(),
                "user_id"      uuid         NOT NULL,
                "airport_icao" varchar(4)   NOT NULL,
                "notes"        text         NULL,
                "created_at"   timestamp(0) NOT NULL DEFAULT now(),
                "updated_at"   timestamp(0) NOT NULL DEFAULT now(),
                CONSTRAINT "favorite_destinations_pk" PRIMARY KEY ("id"),
                CONSTRAINT "favorite_destinations_user_id_airport_icao_unique"
                    UNIQUE ("user_id", "airport_icao")
            )
        `);

        await queryRunner.query(`
            ALTER TABLE "favorite_destinations"
            ADD CONSTRAINT "favorite_destinations_user_id_foreign"
            FOREIGN KEY ("user_id") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "favorite_destinations"
            ADD CONSTRAINT "favorite_destinations_airport_icao_foreign"
            FOREIGN KEY ("airport_icao") REFERENCES "airports"("icao_code")
            ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "favorite_destinations" DROP CONSTRAINT "favorite_destinations_airport_icao_foreign"`);
        await queryRunner.query(`ALTER TABLE "favorite_destinations" DROP CONSTRAINT "favorite_destinations_user_id_foreign"`);
        await queryRunner.query(`DROP TABLE "favorite_destinations"`);
    }
}
