import { AppDataSource } from "../../common/database/data-source";
import { UserPreferences } from "../entities/UserPreferences";
import { getPreferences, updatePreferences } from "../preferences.service";
import { makePreferences, makeRepo } from "./test-utils";
import { NotFoundError } from "../../common/errors/http-errors";

jest.mock("../../common/database/data-source", () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

const mockedGetRepository = AppDataSource.getRepository as jest.Mock;

describe("preferences.service", () => {
  const preferencesRepo = makeRepo();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetRepository.mockImplementation((entity: unknown) => {
      if (entity === UserPreferences) return preferencesRepo;
      return makeRepo();
    });
  });

  it("gets preferences", async () => {
    const preferences = makePreferences();
    preferencesRepo.findOne.mockResolvedValue(preferences);
    const result = await getPreferences("user-1");
    expect(result).toBe(preferences);
  });

  it("throws when preferences missing", async () => {
    preferencesRepo.findOne.mockResolvedValue(null);
    await expect(getPreferences("user-1")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("updates only whitelisted fields", async () => {
    const preferences = makePreferences();
    preferencesRepo.findOne.mockResolvedValue(preferences);
    preferencesRepo.merge.mockImplementation(
      (entity: unknown, patch: unknown) =>
        Object.assign(
          entity as Record<string, unknown>,
          patch as Record<string, unknown>,
        ),
    );

    const result = await updatePreferences("user-1", {
      timezone: "Europe/Warsaw",
      pushNotifications: true,
      ignoredField: "x",
    });

    expect(result.timezone).toBe("Europe/Warsaw");
    expect(
      (result as unknown as Record<string, unknown>).ignoredField,
    ).toBeUndefined();
    expect(preferencesRepo.save).toHaveBeenCalledWith(preferences);
  });
});
