import { AppDataSource } from "../../common/database/data-source";
import { Permission } from "../entities/Permission";
import {
  createPermission,
  deletePermission,
  listPermissions,
} from "../permissions.service";
import { makePermission, makeRepo } from "./test-utils";
import { NotFoundError } from "../../common/errors/http-errors";

jest.mock("../../common/database/data-source", () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

const mockedGetRepository = AppDataSource.getRepository as jest.Mock;

describe("permissions.service", () => {
  const permissionRepo = makeRepo();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetRepository.mockImplementation((entity: unknown) => {
      if (entity === Permission) return permissionRepo;
      return makeRepo();
    });
  });

  it("lists permissions", async () => {
    permissionRepo.find.mockResolvedValue([makePermission()]);
    const result = await listPermissions();
    expect(result).toHaveLength(1);
  });

  it("creates permission", async () => {
    const permission = makePermission();
    permissionRepo.create.mockReturnValue(permission);
    const result = await createPermission({
      name: "users:delete",
      resource: "users",
      action: "delete",
    });
    expect(result).toBe(permission);
    expect(permissionRepo.save).toHaveBeenCalledWith(permission);
  });

  it("deletes permission", async () => {
    const permission = makePermission();
    permissionRepo.findOne.mockResolvedValue(permission);
    await deletePermission(1);
    expect(permissionRepo.remove).toHaveBeenCalledWith(permission);
  });

  it("throws when permission missing", async () => {
    permissionRepo.findOne.mockResolvedValue(null);
    await expect(deletePermission(1)).rejects.toBeInstanceOf(NotFoundError);
  });
});
