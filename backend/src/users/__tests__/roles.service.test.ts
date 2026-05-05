import { AppDataSource } from "../../common/database/data-source";
import { Role } from "../entities/Role";
import { Permission } from "../entities/Permission";
import { RolePermission } from "../entities/RolePermission";
import {
  createRole,
  deleteRole,
  grantPermission,
  listRolePermissions,
  listRoles,
  revokePermission,
  updateRole,
} from "../roles.service";
import {
  makePermission,
  makeRepo,
  makeRole,
  makeRolePermission,
} from "./test-utils";
import { ForbiddenError, NotFoundError } from "../../common/errors/http-errors";

jest.mock("../../common/database/data-source", () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

const mockedGetRepository = AppDataSource.getRepository as jest.Mock;

describe("roles.service", () => {
  const roleRepo = makeRepo();
  const permissionRepo = makeRepo();
  const rolePermissionRepo = makeRepo();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetRepository.mockImplementation((entity: unknown) => {
      if (entity === Role) return roleRepo;
      if (entity === Permission) return permissionRepo;
      if (entity === RolePermission) return rolePermissionRepo;
      return makeRepo();
    });
  });

  it("lists roles", async () => {
    roleRepo.find.mockResolvedValue([makeRole()]);
    const result = await listRoles();
    expect(result).toHaveLength(1);
  });

  it("creates role", async () => {
    const role = makeRole();
    roleRepo.create.mockReturnValue(role);
    const result = await createRole({ name: "manager" });
    expect(result).toBe(role);
    expect(roleRepo.save).toHaveBeenCalledWith(role);
  });

  it("updates role", async () => {
    const role = makeRole({ isSystem: false });
    roleRepo.findOne.mockResolvedValue(role);
    const result = await updateRole(1, { name: "new-role" });
    expect(result.name).toBe("new-role");
  });

  it("prevents updating system role", async () => {
    roleRepo.findOne.mockResolvedValue(makeRole({ isSystem: true }));
    await expect(updateRole(1, { name: "x" })).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("deletes role", async () => {
    const role = makeRole();
    roleRepo.findOne.mockResolvedValue(role);
    await deleteRole(1);
    expect(roleRepo.remove).toHaveBeenCalledWith(role);
  });

  it("lists role permissions", async () => {
    rolePermissionRepo.find.mockResolvedValue([makeRolePermission()]);
    const result = await listRolePermissions(1);
    expect(result).toHaveLength(1);
  });

  it("grants permission", async () => {
    permissionRepo.findOne.mockResolvedValue(makePermission({ id: 2 }));
    rolePermissionRepo.create.mockReturnValue(makeRolePermission());
    await grantPermission(1, 2);
    expect(rolePermissionRepo.save).toHaveBeenCalled();
  });

  it("revokes permission", async () => {
    const rolePermission = makeRolePermission();
    rolePermissionRepo.findOne.mockResolvedValue(rolePermission);
    await revokePermission(1, 1);
    expect(rolePermissionRepo.remove).toHaveBeenCalledWith(rolePermission);
  });

  it("throws on missing role permission", async () => {
    rolePermissionRepo.findOne.mockResolvedValue(null);
    await expect(revokePermission(1, 1)).rejects.toBeInstanceOf(NotFoundError);
  });
});
