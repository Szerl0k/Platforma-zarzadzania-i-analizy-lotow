import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt, { SignOptions } from "jsonwebtoken";
import { AppDataSource } from "../common/database/data-source";
import { User } from "./entities/User";
import { Role } from "./entities/Role";
import { UserPreferences } from "./entities/UserPreferences";
import { RefreshToken } from "./entities/RefreshToken";
import { RolePermission } from "./entities/RolePermission";
import {
  BadRequestError,
  ConflictError,
  InternalError,
  UnauthorizedError,
} from "../common/errors/http-errors";

export const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
export const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_HASH_ROUNDS = 12;

export interface RegisterInput {
  email: unknown;
  password: unknown;
  nickname?: unknown;
}

export interface LoginInput {
  email: unknown;
  password: unknown;
}

export interface UserResponse {
  id: string;
  email: string;
  nickname: string | null;
  emailVerified: boolean;
  profilePublic: boolean;
  roleId: number;
  role: {
    id: number;
    name: string;
    description: string | null;
    isSystem: boolean;
  } | null;
  permissions: string[];
  createdAt: Date;
}

export interface AuthResult {
  user: UserResponse;
  accessToken: string;
  rawRefreshToken: string;
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function signAccessToken(userId: string, roleId: number): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new InternalError("JWT_SECRET is not configured");
  }
  const signOptions: SignOptions = { expiresIn: "15m" };
  return jwt.sign({ userId, roleId }, secret, signOptions);
}

export async function createRefreshTokenRecord(
  userId: string,
  now: Date = new Date(),
): Promise<string> {
  const repo = AppDataSource.getRepository(RefreshToken);
  const rawToken = crypto.randomBytes(40).toString("hex");

  const token = repo.create({
    tokenHash: hashRefreshToken(rawToken),
    userId,
    expiresAt: new Date(now.getTime() + REFRESH_TOKEN_MAX_AGE_MS),
  });

  await repo.save(token);
  return rawToken;
}

export async function buildUserResponse(user: User): Promise<UserResponse> {
  const roleRepo = AppDataSource.getRepository(Role);
  const rpRepo = AppDataSource.getRepository(RolePermission);

  const role = await roleRepo.findOne({ where: { id: user.roleId } });
  const rolePermissions = await rpRepo.find({
    where: { roleId: user.roleId },
    relations: ["permission"],
  });

  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    emailVerified: user.emailVerified,
    profilePublic: user.profilePublic,
    roleId: user.roleId,
    role: role
      ? {
          id: role.id,
          name: role.name,
          description: role.description,
          isSystem: role.isSystem,
        }
      : null,
    permissions: rolePermissions.map((rp) => rp.permission.name),
    createdAt: user.createdAt,
  };
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

function assertString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestError(`${field} is required`);
  }
  return value;
}

export async function registerUser(
  input: RegisterInput,
  now: Date = new Date(),
): Promise<AuthResult> {
  if (
    !input.email ||
    !input.password ||
    typeof input.email !== "string" ||
    typeof input.password !== "string"
  ) {
    throw new BadRequestError("Email and password are required");
  }

  const email = input.email;
  const password = input.password;

  if (!EMAIL_REGEX.test(email)) {
    throw new BadRequestError("Invalid email format");
  }
  if (password.length < 6) {
    throw new BadRequestError("Password must be at least 6 characters");
  }

  const nickname =
    typeof input.nickname === "string" && input.nickname.length > 0
      ? input.nickname
      : null;

  const userRepo = AppDataSource.getRepository(User);
  const roleRepo = AppDataSource.getRepository(Role);
  const prefsRepo = AppDataSource.getRepository(UserPreferences);

  const existing = await userRepo.findOne({ where: { email } });
  if (existing) {
    throw new ConflictError("Email already registered");
  }

  const defaultRole = await roleRepo.findOne({ where: { name: "user" } });
  if (!defaultRole) {
    throw new InternalError("Default role not found");
  }

  const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);

  const user = userRepo.create({
    email,
    passwordHash,
    nickname,
    emailVerified: false,
    profilePublic: false,
    roleId: defaultRole.id,
    createdAt: now,
    updatedAt: now,
  });

  await userRepo.save(user);

  const preferences = prefsRepo.create({
    userId: user.id,
    emailNotifications: true,
    pushNotifications: false,
    notifyOnDelay: true,
    notifyOnGateChange: true,
    notifyOnStatusChange: true,
    delayThresholdMinutes: 15,
    timezone: "UTC",
    distanceUnit: "km",
    createdAt: now,
    updatedAt: now,
  });

  await prefsRepo.save(preferences);

  const accessToken = signAccessToken(user.id, user.roleId);
  const rawRefreshToken = await createRefreshTokenRecord(user.id, now);
  const userResponse = await buildUserResponse(user);

  return { user: userResponse, accessToken, rawRefreshToken };
}

export async function loginUser(
  input: LoginInput,
  now: Date = new Date(),
): Promise<AuthResult> {
  const email = assertString(input.email, "Email");
  const password = assertString(input.password, "Password");

  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { email } });

  const fallbackHash =
    "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinvi";
  const valid = await bcrypt.compare(
    password,
    user ? user.passwordHash : fallbackHash,
  );

  if (!user || !valid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  user.lastLogin = now;
  await userRepo.save(user);

  const accessToken = signAccessToken(user.id, user.roleId);
  const rawRefreshToken = await createRefreshTokenRecord(user.id, now);
  const userResponse = await buildUserResponse(user);

  return { user: userResponse, accessToken, rawRefreshToken };
}

export async function rotateRefreshToken(
  rawRefreshToken: string | undefined,
  now: Date = new Date(),
): Promise<AuthResult> {
  if (!rawRefreshToken) {
    throw new UnauthorizedError("No refresh token");
  }

  const refreshTokenRepo = AppDataSource.getRepository(RefreshToken);
  const tokenHash = hashRefreshToken(rawRefreshToken);

  const stored = await refreshTokenRepo.findOne({ where: { tokenHash } });

  if (!stored) {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  if (stored.expiresAt < now) {
    await refreshTokenRepo.remove(stored);
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  await refreshTokenRepo.remove(stored);

  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: stored.userId } });
  if (!user) {
    throw new UnauthorizedError("User not found");
  }

  const accessToken = signAccessToken(user.id, user.roleId);
  const newRefreshToken = await createRefreshTokenRecord(user.id, now);
  const userResponse = await buildUserResponse(user);

  return { user: userResponse, accessToken, rawRefreshToken: newRefreshToken };
}

export async function logoutUser(
  rawRefreshToken: string | undefined,
): Promise<void> {
  if (!rawRefreshToken) return;
  const repo = AppDataSource.getRepository(RefreshToken);
  await repo.delete({ tokenHash: hashRefreshToken(rawRefreshToken) });
}
