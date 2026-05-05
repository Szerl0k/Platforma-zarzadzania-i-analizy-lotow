import { AppDataSource } from "../../common/database/data-source";
import { User } from "../entities/User";
import { Role } from "../entities/Role";
import { RolePermission } from "../entities/RolePermission";
import {
  assignRole,
  deleteUser,
  getCurrentUser,
  getPublicProfile,
  listUsers,
  updateCurrentUser,
} from "../users.service";
import { makeRepo, makeRole, makeRolePermission, makeUser } from "./test-utils";
import { ForbiddenError, NotFoundError } from "../../common/errors/http-errors";

jest.mock("../../common/database/data-source", () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

const mockedGetRepository = AppDataSource.getRepository as jest.Mock;

describe("users.service", () => {
  const userRepo = makeRepo();
  const roleRepo = makeRepo();
  const rolePermissionRepo = makeRepo();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetRepository.mockImplementation((entity: unknown) => {
      if (entity === User) return userRepo;
      if (entity === Role) return roleRepo;
      if (entity === RolePermission) return rolePermissionRepo;
      return makeRepo();
    });
  });

  it("returns current user with permissions", async () => {
    userRepo.findOne.mockResolvedValue(makeUser());
    rolePermissionRepo.find.mockImplementation(async () => [
      makeRolePermission({
        permission: {
          ...makeRolePermission().permission,
          name: "users:write",
        },
      }),
    ]);
    const result = await getCurrentUser("user-1");
    expect(result.permissions).toEqual(["users:write"]);
  });

  it("updates current user fields", async () => {
    const user = makeUser();
    userRepo.findOne.mockResolvedValue(user);
    rolePermissionRepo.find.mockResolvedValue([]);
    const result = await updateCurrentUser("user-1", { nickname: "new" });
    expect(result.nickname).toBe("new");
    expect(userRepo.save).toHaveBeenCalledWith(user);
  });

  it("lists users paginated", async () => {
    userRepo.findAndCount.mockResolvedValue([[makeUser()], 1]);
    const result = await listUsers({ q: "john", page: 1, limit: 20 });
    expect(result.total).toBe(1);
    expect(userRepo.findAndCount).toHaveBeenCalled();
  });

  it("assigns role", async () => {
    roleRepo.findOne.mockResolvedValue(makeRole({ id: 2 }));
    userRepo.findOne
      .mockResolvedValueOnce(makeUser({ id: "user-2" }))
      .mockResolvedValueOnce(makeUser({ id: "user-2", roleId: 2 }));
    const result = await assignRole("user-2", 2, "user-1");
    expect(result.roleId).toBe(2);
  });

  it("blocks self role downgrade", async () => {
    roleRepo.findOne.mockImplementation(async () => makeRole({ id: 3 }));
    rolePermissionRepo.find.mockImplementation(async () => []);
    await expect(assignRole("user-1", 3, "user-1")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("returns profile for public users", async () => {
    userRepo.findOne.mockResolvedValue(makeUser({ profilePublic: true }));
    const result = await getPublicProfile("user-1", null);
    expect(result.id).toBe("user-1");
  });

  it("blocks private profile without permission", async () => {
    userRepo.findOne.mockResolvedValue(makeUser({ profilePublic: false }));
    rolePermissionRepo.find.mockResolvedValue([]);
    await expect(getPublicProfile("user-1", 1)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("deletes user", async () => {
    const user = makeUser({ id: "user-2" });
    userRepo.findOne.mockResolvedValue(user);
    await deleteUser("user-2", "user-1");
    expect(userRepo.remove).toHaveBeenCalledWith(user);
  });

  it("throws when deleting missing user", async () => {
    userRepo.findOne.mockResolvedValue(null);
    await expect(deleteUser("user-2", "user-1")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
