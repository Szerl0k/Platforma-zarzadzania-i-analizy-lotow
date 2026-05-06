import { AppDataSource } from "../common/database/data-source";
import { Role } from "./entities/Role";
import { Permission } from "./entities/Permission";
import { RolePermission } from "./entities/RolePermission";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../common/errors/http-errors";

export interface CreateRoleInput {
  name: unknown;
  description?: unknown;
}

export interface UpdateRoleInput {
  name?: unknown;
  description?: unknown;
}

export async function listRoles(): Promise<Role[]> {
  return AppDataSource.getRepository(Role).find();
}

export async function createRole(
  input: CreateRoleInput,
  now: Date = new Date(),
): Promise<Role> {
  if (typeof input.name !== "string" || input.name.length === 0) {
    throw new BadRequestError("Name is required");
  }
  const description =
    typeof input.description === "string" ? input.description : null;

  const repo = AppDataSource.getRepository(Role);
  const role = repo.create({
    name: input.name,
    description,
    isSystem: false,
    createdAt: now,
    updatedAt: now,
  });
  await repo.save(role);
  return role;
}

export async function updateRole(
  roleId: number,
  input: UpdateRoleInput,
  now: Date = new Date(),
): Promise<Role> {
  const repo = AppDataSource.getRepository(Role);
  const role = await repo.findOne({ where: { id: roleId } });
  if (!role) {
    throw new NotFoundError("Role not found");
  }
  if (role.isSystem) {
    throw new ForbiddenError("Cannot modify system roles");
  }

  if (input.name !== undefined) {
    if (typeof input.name !== "string" || input.name.length === 0) {
      throw new BadRequestError("Name must be a non-empty string");
    }
    role.name = input.name;
  }
  if (input.description !== undefined) {
    if (input.description !== null && typeof input.description !== "string") {
      throw new BadRequestError("Description must be a string or null");
    }
    role.description = input.description;
  }
  role.updatedAt = now;
  await repo.save(role);
  return role;
}

export async function deleteRole(roleId: number): Promise<void> {
  const repo = AppDataSource.getRepository(Role);
  const role = await repo.findOne({ where: { id: roleId } });
  if (!role) {
    throw new NotFoundError("Role not found");
  }
  if (role.isSystem) {
    throw new ForbiddenError("Cannot delete system roles");
  }
  await repo.remove(role);
}

export async function listRolePermissions(
  roleId: number,
): Promise<Permission[]> {
  const rpRepo = AppDataSource.getRepository(RolePermission);
  const rolePermissions = await rpRepo.find({
    where: { roleId },
    relations: ["permission"],
  });
  return rolePermissions.map((rp) => rp.permission);
}

export async function grantPermission(
  roleId: number,
  permissionId: unknown,
  now: Date = new Date(),
): Promise<RolePermission> {
  if (typeof permissionId !== "number") {
    throw new BadRequestError("permissionId is required");
  }
  const permRepo = AppDataSource.getRepository(Permission);
  const permission = await permRepo.findOne({ where: { id: permissionId } });
  if (!permission) {
    throw new NotFoundError("Permission not found");
  }
  const rpRepo = AppDataSource.getRepository(RolePermission);
  const rp = rpRepo.create({
    roleId,
    permissionId,
    grantedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await rpRepo.save(rp);
  return rp;
}

export async function revokePermission(
  roleId: number,
  permissionId: number,
): Promise<void> {
  const rpRepo = AppDataSource.getRepository(RolePermission);
  const rp = await rpRepo.findOne({ where: { roleId, permissionId } });
  if (!rp) {
    throw new NotFoundError("Role permission not found");
  }
  await rpRepo.remove(rp);
}
