import { AppDataSource } from "../common/database/data-source";
import { Permission } from "./entities/Permission";
import {
  BadRequestError,
  NotFoundError,
} from "../common/errors/http-errors";

export interface CreatePermissionInput {
  name: unknown;
  resource: unknown;
  action: unknown;
  description?: unknown;
}

export async function listPermissions(): Promise<Permission[]> {
  return AppDataSource.getRepository(Permission).find();
}

export async function createPermission(
  input: CreatePermissionInput,
  now: Date = new Date(),
): Promise<Permission> {
  if (
    typeof input.name !== "string" ||
    typeof input.resource !== "string" ||
    typeof input.action !== "string" ||
    input.name.length === 0 ||
    input.resource.length === 0 ||
    input.action.length === 0
  ) {
    throw new BadRequestError("name, resource, and action are required");
  }
  const description =
    typeof input.description === "string" ? input.description : null;

  const repo = AppDataSource.getRepository(Permission);
  const permission = repo.create({
    name: input.name,
    resource: input.resource,
    action: input.action,
    description,
    createdAt: now,
    updatedAt: now,
  });
  await repo.save(permission);
  return permission;
}

export async function deletePermission(permissionId: number): Promise<void> {
  const repo = AppDataSource.getRepository(Permission);
  const permission = await repo.findOne({ where: { id: permissionId } });
  if (!permission) {
    throw new NotFoundError("Permission not found");
  }
  await repo.remove(permission);
}
