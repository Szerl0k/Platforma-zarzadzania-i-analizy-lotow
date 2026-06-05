import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  buildUserResponse,
  loginUser,
  logoutUser,
  registerUser,
  rotateRefreshToken,
} from "../auth.service";
import { AppDataSource } from "../../common/database/data-source";
import { User } from "../entities/User";
import { Role } from "../entities/Role";
import { UserPreferences } from "../entities/UserPreferences";
import { RefreshToken } from "../entities/RefreshToken";
import { RolePermission } from "../entities/RolePermission";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalError,
  UnauthorizedError,
} from "../../common/errors/http-errors";
import {
  makeRepo,
  makeRole,
  makeRolePermission,
  makeUser,
  makeRefreshToken,
} from "./test-utils";

jest.mock("../../common/database/data-source", () => {
  const getRepository = jest.fn();
  return {
    AppDataSource: {
      getRepository,
      manager: { getRepository },
      transaction: jest.fn(
        async (cb: (m: { getRepository: jest.Mock }) => unknown) =>
          cb({ getRepository }),
      ),
    },
  };
});
jest.mock("bcrypt");
jest.mock("jsonwebtoken");

const mockedGetRepository = AppDataSource.getRepository as jest.Mock;
const mockedHash = bcrypt.hash as jest.Mock;
const mockedCompare = bcrypt.compare as jest.Mock;
const mockedSign = jwt.sign as jest.Mock;

describe("auth.service", () => {
  const userRepo = makeRepo();
  const roleRepo = makeRepo();
  const prefsRepo = makeRepo();
  const refreshTokenRepo = makeRepo();
  const rolePermissionRepo = makeRepo();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "secret";
    mockedSign.mockReturnValue("access-token");
    mockedGetRepository.mockImplementation((entity: unknown) => {
      if (entity === User) return userRepo;
      if (entity === Role) return roleRepo;
      if (entity === UserPreferences) return prefsRepo;
      if (entity === RefreshToken) return refreshTokenRepo;
      if (entity === RolePermission) return rolePermissionRepo;
      return makeRepo();
    });
  });

  it("registers user and creates defaults", async () => {
    const user = makeUser();
    const role = makeRole({ id: 2, name: "user" });
    userRepo.findOne.mockResolvedValue(null);
    roleRepo.findOne.mockResolvedValue(role);
    mockedHash.mockResolvedValue("hashed");
    userRepo.create.mockReturnValue(user);
    prefsRepo.create.mockReturnValue({});
    rolePermissionRepo.find.mockResolvedValue([
      makeRolePermission({
        permission: { ...makeRolePermission().permission, name: "users:read" },
      }),
    ]);

    const result = await registerUser({
      email: "john@example.com",
      password: "Secret123!",
      nickname: "john",
    });

    expect(userRepo.save).toHaveBeenCalledWith(user);
    expect(prefsRepo.save).toHaveBeenCalled();
    expect(typeof result.rawVerificationToken).toBe("string");
    expect(result.user.email).toBe("john@example.com");
  });

  it("rejects weak passwords", async () => {
    await expect(
      registerUser({ email: "john@example.com", password: "secret123" }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("throws ConflictError when email exists", async () => {
    userRepo.findOne.mockResolvedValue(makeUser());
    await expect(
      registerUser({ email: "john@example.com", password: "Secret123!" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("throws InternalError when default role missing", async () => {
    userRepo.findOne.mockResolvedValue(null);
    roleRepo.findOne.mockResolvedValue(null);
    await expect(
      registerUser({ email: "john@example.com", password: "Secret123!" }),
    ).rejects.toBeInstanceOf(InternalError);
  });

  it("rejects login for unverified account", async () => {
    const user = makeUser({ emailVerified: false });
    userRepo.findOne.mockResolvedValue(user);
    mockedCompare.mockResolvedValue(true);
    await expect(
      loginUser({ email: "john@example.com", password: "Secret123!" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("logs in user", async () => {
    const user = makeUser({ emailVerified: true });
    userRepo.findOne.mockResolvedValue(user);
    mockedCompare.mockResolvedValue(true);
    roleRepo.findOne.mockResolvedValue(makeRole());
    rolePermissionRepo.find.mockResolvedValue([]);
    refreshTokenRepo.create.mockReturnValue(makeRefreshToken());

    const result = await loginUser({
      email: "john@example.com",
      password: "Secret123!",
    });

    expect(userRepo.save).toHaveBeenCalledWith(user);
    expect(result.user.id).toBe(user.id);
  });

  it("rejects invalid login", async () => {
    userRepo.findOne.mockResolvedValue(null);
    mockedCompare.mockResolvedValue(false);
    await expect(
      loginUser({ email: "john@example.com", password: "bad" }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rotates refresh token", async () => {
    const stored = makeRefreshToken();
    const user = makeUser();
    refreshTokenRepo.findOne.mockResolvedValue(stored);
    userRepo.findOne.mockResolvedValue(user);
    refreshTokenRepo.create.mockReturnValue(makeRefreshToken({ id: "rt-2" }));
    roleRepo.findOne.mockResolvedValue(makeRole());
    rolePermissionRepo.find.mockResolvedValue([]);

    const result = await rotateRefreshToken("raw-token");

    expect(refreshTokenRepo.delete).toHaveBeenCalledWith({ id: stored.id });
    expect(result.accessToken).toBe("access-token");
  });

  it("logout deletes token hash", async () => {
    await logoutUser("raw-token");
    expect(refreshTokenRepo.delete).toHaveBeenCalled();
  });

  it("builds user response with permissions", async () => {
    const user = makeUser();
    roleRepo.findOne.mockResolvedValue(makeRole());
    rolePermissionRepo.find.mockResolvedValue([
      makeRolePermission({
        permission: { ...makeRolePermission().permission, name: "users:write" },
      }),
    ]);

    const result = await buildUserResponse(user);

    expect(result.permissions).toEqual(["users:write"]);
  });
});
