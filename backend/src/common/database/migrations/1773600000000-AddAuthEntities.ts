import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuthEntities1773600000000 implements MigrationInterface {
    name = 'AddAuthEntities1773600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create roles table
        await queryRunner.query(`
            CREATE TABLE "roles" (
                "id" SERIAL NOT NULL,
                "name" character varying(50) NOT NULL,
                "description" character varying(255),
                "is_system" boolean NOT NULL,
                "created_at" TIMESTAMP(0) NOT NULL,
                CONSTRAINT "UQ_roles_name" UNIQUE ("name"),
                CONSTRAINT "PK_roles" PRIMARY KEY ("id")
            )
        `);

        // Create permissions table
        await queryRunner.query(`
            CREATE TABLE "permissions" (
                "id" SERIAL NOT NULL,
                "name" character varying(100) NOT NULL,
                "resource" character varying(100) NOT NULL,
                "action" character varying(50) NOT NULL,
                "description" character varying(255),
                CONSTRAINT "UQ_permissions_name" UNIQUE ("name"),
                CONSTRAINT "PK_permissions" PRIMARY KEY ("id")
            )
        `);

        // Create role_permissions table
        await queryRunner.query(`
            CREATE TABLE "role_permissions" (
                "role_id" integer NOT NULL,
                "permission_id" integer NOT NULL,
                "granted_at" TIMESTAMP(0) NOT NULL,
                CONSTRAINT "PK_role_permissions" PRIMARY KEY ("role_id", "permission_id")
            )
        `);

        // Create users table
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying(255) NOT NULL,
                "password_hash" character varying(255) NOT NULL,
                "nickname" character varying(50),
                "email_verified" boolean NOT NULL,
                "verification_token" character varying(255),
                "verification_token_expires" TIMESTAMP(0),
                "password_reset_token" character varying(255),
                "password_reset_expires" TIMESTAMP(0),
                "profile_public" boolean NOT NULL,
                "created_at" TIMESTAMP(0) NOT NULL,
                "updated_at" TIMESTAMP(0) NOT NULL,
                "last_login" TIMESTAMP(0),
                "role_id" integer NOT NULL,
                CONSTRAINT "PK_users" PRIMARY KEY ("id")
            )
        `);

        // Create user_preferences table
        await queryRunner.query(`
            CREATE TABLE "user_preferences" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "email_notifications" boolean NOT NULL,
                "push_notifications" boolean NOT NULL,
                "notify_on_delay" boolean NOT NULL,
                "notify_on_gate_change" boolean NOT NULL,
                "notify_on_status_change" boolean NOT NULL,
                "delay_threshold_minutes" integer NOT NULL,
                "timezone" character varying(50) NOT NULL,
                "distance_unit" character varying(10) NOT NULL,
                "created_at" TIMESTAMP(0) NOT NULL,
                "updated_at" TIMESTAMP(0) NOT NULL,
                CONSTRAINT "UQ_user_preferences_user_id" UNIQUE ("user_id"),
                CONSTRAINT "PK_user_preferences" PRIMARY KEY ("id")
            )
        `);

        // Foreign keys
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_role_permissions_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_role_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_users_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_preferences" ADD CONSTRAINT "FK_user_preferences_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        // Seed default roles
        await queryRunner.query(`
            INSERT INTO "roles" ("name", "description", "is_system", "created_at") VALUES
            ('admin', 'System administrator', true, NOW()),
            ('user', 'Regular user', true, NOW())
        `);

        // Seed default permissions
        await queryRunner.query(`
            INSERT INTO "permissions" ("name", "resource", "action", "description") VALUES
            ('users:read', 'users', 'read', 'View user profiles'),
            ('users:write', 'users', 'write', 'Modify user profiles'),
            ('users:delete', 'users', 'delete', 'Delete users'),
            ('flights:read', 'flights', 'read', 'View flights'),
            ('flights:write', 'flights', 'write', 'Modify flights')
        `);

        // Assign all permissions to admin role
        await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id", "granted_at")
            SELECT r.id, p.id, NOW()
            FROM "roles" r, "permissions" p
            WHERE r.name = 'admin'
        `);

        // Assign read permissions to user role
        await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id", "granted_at")
            SELECT r.id, p.id, NOW()
            FROM "roles" r, "permissions" p
            WHERE r.name = 'user' AND p.action = 'read'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_preferences" DROP CONSTRAINT "FK_user_preferences_user"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_role"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_role_permissions_permission"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_role_permissions_role"`);
        await queryRunner.query(`DROP TABLE "user_preferences"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "role_permissions"`);
        await queryRunner.query(`DROP TABLE "permissions"`);
        await queryRunner.query(`DROP TABLE "roles"`);
    }
}
