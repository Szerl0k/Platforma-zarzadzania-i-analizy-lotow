import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueConstrainForCities1774276887311 implements MigrationInterface {
    name = 'AddUniqueConstrainForCities1774276887311'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cities" ADD CONSTRAINT "UQ_country_city" UNIQUE ("country_code", "name")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cities" DROP CONSTRAINT "UQ_country_city"`);
    }

}
