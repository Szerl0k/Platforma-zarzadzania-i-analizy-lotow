import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPushSubscriptions1778600000002 implements MigrationInterface {
  name = "AddPushSubscriptions1778600000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "push_subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "user_id" uuid NOT NULL,
        "endpoint" text NOT NULL,
        "p256dh" character varying(255) NOT NULL,
        "auth" character varying(255) NOT NULL,
        CONSTRAINT "UQ_push_subscriptions_endpoint" UNIQUE ("endpoint"),
        CONSTRAINT "PK_push_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_push_subscriptions_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_push_subscriptions_user_id" ON "push_subscriptions" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_push_subscriptions_user_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "push_subscriptions"`);
  }
}
