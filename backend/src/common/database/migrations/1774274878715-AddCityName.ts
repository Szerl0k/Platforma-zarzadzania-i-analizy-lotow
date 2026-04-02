import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCityName1774274878715 implements MigrationInterface {
    name = 'AddCityName1774274878715'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cities" ADD "name" character varying NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cities" DROP COLUMN "name"`);
    }

}
