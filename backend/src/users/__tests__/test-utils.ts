import { User } from "../entities/User";
import { Role } from "../entities/Role";
import { Permission } from "../entities/Permission";
import { RolePermission } from "../entities/RolePermission";
import { RefreshToken } from "../entities/RefreshToken";
import { UserPreferences } from "../entities/UserPreferences";
import { Mailer } from "../mailer";

type MockFn = jest.Mock;

export interface RepoMock {
  findOne: MockFn;
  find: MockFn;
  findAndCount: MockFn;
  save: MockFn;
  remove: MockFn;
  delete: MockFn;
  create: MockFn;
  merge: MockFn;
  createQueryBuilder: MockFn;
}

export function makeRepo(): RepoMock {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
    create: jest
      .fn()
      .mockImplementation((data: unknown) =>
        typeof data === "object" && data !== null ? { ...data } : {},
      ),
    merge: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

export function makeRole(overrides: Partial<Role> = {}): Role {
  return {
    id: 1,
    name: "user",
    description: "User role",
    isSystem: false,
    rolePermissions: [],
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  } as Role;
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "john@example.com",
    passwordHash: "hash",
    nickname: "john",
    emailVerified: false,
    verificationToken: null,
    verificationTokenExpires: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    profilePublic: false,
    lastLogin: null,
    roleId: 1,
    role: makeRole(),
    preferences: {} as UserPreferences,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  } as User;
}

export function makePermission(
  overrides: Partial<Permission> = {},
): Permission {
  return {
    id: 1,
    name: "users:write",
    resource: "users",
    action: "write",
    description: "Users write",
    rolePermissions: [],
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  } as Permission;
}

export function makeRolePermission(
  overrides: Partial<RolePermission> = {},
): RolePermission {
  return {
    roleId: 1,
    permissionId: 1,
    role: makeRole(),
    permission: makePermission(),
    grantedAt: new Date("2025-01-01T00:00:00Z"),
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  } as RolePermission;
}

export function makeRefreshToken(
  overrides: Partial<RefreshToken> = {},
): RefreshToken {
  return {
    id: "rt-1",
    tokenHash: "token-hash",
    userId: "user-1",
    expiresAt: new Date("2030-01-01T00:00:00Z"),
    user: makeUser(),
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  } as RefreshToken;
}

export function makePreferences(
  overrides: Partial<UserPreferences> = {},
): UserPreferences {
  return {
    id: "pref-1",
    userId: "user-1",
    user: makeUser(),
    emailNotifications: true,
    pushNotifications: false,
    notifyOnDelay: true,
    notifyOnGateChange: true,
    notifyOnStatusChange: true,
    delayThresholdMinutes: 15,
    timezone: "UTC",
    distanceUnit: "km",
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  } as UserPreferences;
}

export function makeMailer(): jest.Mocked<Mailer> {
  return {
    sendPasswordReset: jest.fn(),
  };
}
