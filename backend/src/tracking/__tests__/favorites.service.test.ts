import { AppDataSource } from "../../common/database/data-source";
import { FavouriteDestination } from "../entities/FavouriteDestination";
import { Airport } from "../../geo/entities/Airport";
import {
  addFavorite,
  listFavoritesForUser,
  removeFavorite,
} from "../favorites.service";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../common/errors/http-errors";
import { makeRepo } from "../../users/__tests__/test-utils";

jest.mock("../../common/database/data-source", () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

const mockedGetRepository = AppDataSource.getRepository as jest.Mock;

function makeFav(overrides: Partial<FavouriteDestination> = {}): FavouriteDestination {
  return {
    id: "fav-1",
    userId: "user-1",
    airportIcao: "EPWA",
    notes: null,
    airport: {
      icaoCode: "EPWA",
      iataCode: "WAW",
      name: "Warsaw Chopin",
      city: {
        name: "Warszawa",
        country: { name: "Polska" },
      },
    } as any,
    createdAt: new Date("2026-05-01T00:00:00Z"),
    updatedAt: new Date("2026-05-01T00:00:00Z"),
    ...overrides,
  } as FavouriteDestination;
}

describe("favorites.service", () => {
  const favRepo = makeRepo();
  const airportRepo = makeRepo();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetRepository.mockImplementation((entity: unknown) => {
      if (entity === FavouriteDestination) return favRepo;
      if (entity === Airport) return airportRepo;
      return makeRepo();
    });
  });

  describe("listFavoritesForUser", () => {
    it("returns serialized favorites", async () => {
      favRepo.find.mockResolvedValue([makeFav()]);
      const result = await listFavoritesForUser("user-1");
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "fav-1",
        airportIcao: "EPWA",
        airportName: "Warsaw Chopin",
        cityName: "Warszawa",
        countryName: "Polska",
      });
    });

    it("rejects without userId", async () => {
      await expect(listFavoritesForUser("")).rejects.toBeInstanceOf(BadRequestError);
    });
  });

  describe("addFavorite", () => {
    it("adds new favorite", async () => {
      airportRepo.findOne.mockResolvedValue({ icaoCode: "EPWA" });
      favRepo.findOne.mockImplementation((opts: any) => {
        if (opts.where?.id) return Promise.resolve(makeFav());
        return Promise.resolve(null);
      });
      favRepo.create.mockReturnValue(makeFav());
      favRepo.save.mockResolvedValue(makeFav());
      const result = await addFavorite("user-1", "epwa", "Stolica");
      expect(result.airportIcao).toBe("EPWA");
      expect(favRepo.save).toHaveBeenCalled();
    });

    it("rejects invalid icao", async () => {
      await expect(addFavorite("user-1", "ZZ")).rejects.toBeInstanceOf(
        BadRequestError,
      );
    });

    it("404 when airport not in DB", async () => {
      airportRepo.findOne.mockResolvedValue(null);
      await expect(addFavorite("user-1", "ZZZZ")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("conflict when already exists", async () => {
      airportRepo.findOne.mockResolvedValue({ icaoCode: "EPWA" });
      favRepo.findOne.mockResolvedValue(makeFav());
      await expect(addFavorite("user-1", "EPWA")).rejects.toBeInstanceOf(
        ConflictError,
      );
    });
  });

  describe("removeFavorite", () => {
    it("deletes when exists", async () => {
      favRepo.findOne.mockResolvedValue(makeFav());
      favRepo.delete.mockResolvedValue({ affected: 1 });
      await removeFavorite("user-1", "fav-1");
      expect(favRepo.delete).toHaveBeenCalledWith({
        id: "fav-1",
        userId: "user-1",
      });
    });

    it("404 when missing", async () => {
      favRepo.findOne.mockResolvedValue(null);
      await expect(removeFavorite("user-1", "missing")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });
});
