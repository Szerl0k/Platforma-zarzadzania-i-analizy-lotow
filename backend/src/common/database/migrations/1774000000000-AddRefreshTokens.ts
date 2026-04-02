import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokens1774000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "refresh_tokens" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "token_hash" character varying(255) NOT NULL,
                "user_id" uuid NOT NULL,
                "expires_at" TIMESTAMP(0) NOT NULL,
                "created_at" TIMESTAMP(0) NOT NULL,
                CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
                CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id")
                    REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_refresh_tokens_user_id" ON "refresh_tokens" ("user_id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_refresh_tokens_user_id"`);
        await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    }
}
