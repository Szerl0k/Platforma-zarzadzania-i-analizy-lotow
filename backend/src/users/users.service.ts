import { ILike, FindOptionsWhere } from "typeorm";
import { AppDataSource } from "../common/database/data-source";
import { User } from "./entities/User";
import { Role } from "./entities/Role";
import { RolePermission } from "./entities/RolePermission";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../common/errors/http-errors";

export interface SafeUser {
  id: string;
  email: string;
  nickname: string | null;
  emailVerified: boolean;
  profilePublic: boolean;
  lastLogin: Date | null;
  roleId: number;
  role: Role | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithPermissions extends SafeUser {
  permissions: string[];
}

export interface ProfilePatch {
  nickname?: unknown;
  profilePublic?: unknown;
}

export interface ListUsersParams {
  q?: string;
  page?: number;
  limit?: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PublicProfile {
  id: string;
  nickname: string | null;
  profilePublic: boolean;
  createdAt: Date;
}

export function sanitizeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    emailVerified: user.emailVerified,
    profilePublic: user.profilePublic,
    lastLogin: user.lastLogin,
    roleId: user.roleId,
    role: user.role ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function getPermissionNamesForRole(
  roleId: number,
): Promise<string[]> {
  const rpRepo = AppDataSource.getRepository(RolePermission);
  const rolePermissions = await rpRepo.find({
    where: { roleId },
    relations: ["permission"],
  });
  return rolePermissions.map((rp) => rp.permission.name);
}

export async function getCurrentUser(
  userId: string,
): Promise<UserWithPermissions> {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({
    where: { id: userId },
    relations: ["role"],
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const permissions = await getPermissionNamesForRole(user.roleId);
  return { ...sanitizeUser(user), permissions };
}

export async function updateCurrentUser(
  userId: string,
  patch: ProfilePatch,
  now: Date = new Date(),
): Promise<UserWithPermissions> {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({
    where: { id: userId },
    relations: ["role"],
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (patch.nickname !== undefined) {
    if (patch.nickname !== null && typeof patch.nickname !== "string") {
      throw new BadRequestError("nickname must be a string or null");
    }
    user.nickname = patch.nickname;
  }
  if (patch.profilePublic !== undefined) {
    if (typeof patch.profilePublic !== "boolean") {
      throw new BadRequestError("profilePublic must be a boolean");
    }
    user.profilePublic = patch.profilePublic;
  }
  user.updatedAt = now;

  await userRepo.save(user);

  const permissions = await getPermissionNamesForRole(user.roleId);
  return { ...sanitizeUser(user), permissions };
}

export async function listUsers(
  params: ListUsersParams,
): Promise<Paginated<SafeUser>> {
  const q = (params.q ?? "").trim();
  const pageRaw = params.page ?? 1;
  const limitRaw = params.limit ?? 20;
  const page = Math.max(1, Number.isFinite(pageRaw) ? pageRaw : 1);
  const limit = Math.min(
    100,
    Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 20),
  );
  const skip = (page - 1) * limit;

  const userRepo = AppDataSource.getRepository(User);

  const where: FindOptionsWhere<User>[] | undefined = q
    ? [{ email: ILike(`%${q}%`) }, { nickname: ILike(`%${q}%`) }]
    : undefined;

  const [users, total] = await userRepo.findAndCount({
    where,
    relations: ["role"],
    order: { createdAt: "DESC" },
    skip,
    take: limit,
  });

  return { items: users.map(sanitizeUser), total, page, limit };
}

export async function assignRole(
  targetUserId: string,
  roleId: unknown,
  requesterUserId: string,
  now: Date = new Date(),
): Promise<SafeUser> {
  if (typeof roleId !== "number") {
    throw new BadRequestError("roleId (number) is required");
  }

  const roleRepo = AppDataSource.getRepository(Role);
  const role = await roleRepo.findOne({ where: { id: roleId } });
  if (!role) {
    throw new NotFoundError("Role not found");
  }

  if (targetUserId === requesterUserId) {
    const newPermissions = await getPermissionNamesForRole(roleId);
    if (!newPermissions.includes("users:write")) {
      throw new ForbiddenError(
        "Cannot remove users:write from your own account",
      );
    }
  }

  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: targetUserId } });
  if (!user) {
    throw new NotFoundError("User not found");
  }

  user.roleId = roleId;
  user.updatedAt = now;
  await userRepo.save(user);

  const reloaded = await userRepo.findOne({
    where: { id: user.id },
    relations: ["role"],
  });
  if (!reloaded) {
    throw new NotFoundError("User not found");
  }
  return sanitizeUser(reloaded);
}

export async function getPublicProfile(
  targetUserId: string,
  requesterRoleId: number | null,
): Promise<PublicProfile> {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({
    where: { id: targetUserId },
    relations: ["role"],
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (!user.profilePublic) {
    const requesterPermissions =
      requesterRoleId !== null
        ? await getPermissionNamesForRole(requesterRoleId)
        : [];
    if (!requesterPermissions.includes("users:write")) {
      throw new ForbiddenError("Profile is private");
    }
  }

  return {
    id: user.id,
    nickname: user.nickname,
    profilePublic: user.profilePublic,
    createdAt: user.createdAt,
  };
}

export async function deleteUser(
  targetUserId: string,
  requesterUserId: string,
): Promise<void> {
  if (targetUserId === requesterUserId) {
    throw new ForbiddenError("Cannot delete your own account");
  }
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: targetUserId } });
  if (!user) {
    throw new NotFoundError("User not found");
  }
  await userRepo.remove(user);
}
