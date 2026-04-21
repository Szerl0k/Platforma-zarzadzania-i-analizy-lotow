import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGeoPermissions1774400000000 implements MigrationInterface {
  name = "AddGeoPermissions1774400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            INSERT INTO "permissions" ("name", "resource", "action", "description") VALUES
            ('geo:read', 'geo', 'read', 'View airports and airlines'),
            ('geo:write', 'geo', 'write', 'Create or modify airports and airlines'),
            ('geo:delete', 'geo', 'delete', 'Delete airports and airlines')
        `);

    await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id", "granted_at")
            SELECT r.id, p.id, NOW()
            FROM "roles" r, "permissions" p
            WHERE r.name = 'admin'
              AND p.name IN ('geo:read', 'geo:write', 'geo:delete')
        `);

    await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id", "granted_at")
            SELECT r.id, p.id, NOW()
            FROM "roles" r, "permissions" p
            WHERE r.name = 'user'
              AND p.name = 'geo:read'
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DELETE FROM "role_permissions"
            WHERE permission_id IN (
                SELECT id FROM "permissions"
                WHERE name IN ('geo:read', 'geo:write', 'geo:delete')
            )
        `);
    await queryRunner.query(`
            DELETE FROM "permissions"
            WHERE name IN ('geo:read', 'geo:write', 'geo:delete')
        `);
  }
}
