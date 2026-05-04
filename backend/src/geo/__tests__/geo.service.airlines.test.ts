import {
  findAirlineInDb,
  searchAirlines,
  listAirlines,
  createAirline,
  updateAirline,
  deleteAirline,
  getOrFetchAirline,
  BadRequestError,
  NotFoundError,
  UpstreamError,
} from "../geo.service";
import { Airport } from "../entities/Airport";
import { Airline } from "../entities/Airline";
import { City } from "../entities/City";
import { Country } from "../entities/Country";

jest.mock("../../common/database/data-source", () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

jest.mock("../../common/integrations/aeroapi", () => {
  const actual = jest.requireActual("../../common/integrations/aeroapi");
  return { getAeroApiClient: jest.fn(), AeroAPIError: actual.AeroAPIError };
});

import { AppDataSource } from "../../common/database/data-source";
import {
  getAeroApiClient,
  AeroAPIError,
} from "../../common/integrations/aeroapi";

const mockGetRepository = AppDataSource.getRepository as jest.Mock;
const mockGetAeroApiClient = getAeroApiClient as jest.Mock;

function makeRepo() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    create: jest.fn().mockImplementation((data: unknown) => ({
      ...(data as object),
    })),
    createQueryBuilder: jest.fn(),
  };
}

let airlineRepo: ReturnType<typeof makeRepo>;

function makeAirline(overrides: Partial<Airline> = {}): Airline {
  return {
    icaoCode: "LOT",
    iataCode: "LO",
    name: "LOT Polish Airlines",
    ...overrides,
  } as unknown as Airline;
}

beforeEach(() => {
  airlineRepo = makeRepo();
  const unused = makeRepo();

  mockGetRepository.mockImplementation((entity: unknown) => {
    if (entity === Airline) return airlineRepo;
    if (entity === Airport) return unused;
    if (entity === City) return unused;
    if (entity === Country) return unused;
  });
});

describe("findAirlineInDb", () => {
  it("returns airline when found by ICAO code", async () => {
    const airline = makeAirline();
    airlineRepo.findOne.mockResolvedValue(airline);

    const result = await findAirlineInDb("LOT");

    expect(result).toBe(airline);
    expect(airlineRepo.findOne).toHaveBeenCalledWith({
      where: [{ icaoCode: "LOT" }, { iataCode: "LOT" }],
    });
  });

  it("returns airline when found by IATA code", async () => {
    const airline = makeAirline();
    airlineRepo.findOne.mockResolvedValue(airline);

    const result = await findAirlineInDb("LO");

    expect(result).toBe(airline);
    expect(airlineRepo.findOne).toHaveBeenCalledWith({
      where: [{ icaoCode: "LO" }, { iataCode: "LO" }],
    });
  });

  it("normalizes code to uppercase", async () => {
    airlineRepo.findOne.mockResolvedValue(null);

    await findAirlineInDb("lot");

    expect(airlineRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: [{ icaoCode: "LOT" }, { iataCode: "LOT" }],
      }),
    );
  });

  it("returns null when airline not found", async () => {
    airlineRepo.findOne.mockResolvedValue(null);
    expect(await findAirlineInDb("XXX")).toBeNull();
  });
});

describe("searchAirlines", () => {
  it("returns empty array for empty query string", async () => {
    expect(await searchAirlines("")).toEqual([]);
    expect(airlineRepo.find).not.toHaveBeenCalled();
  });

  it("returns empty array for whitespace-only query", async () => {
    expect(await searchAirlines("   ")).toEqual([]);
  });

  it("returns matching airlines from repository", async () => {
    const airlines = [makeAirline()];
    airlineRepo.find.mockResolvedValue(airlines);

    const result = await searchAirlines("LOT");

    expect(result).toBe(airlines);
    expect(airlineRepo.find).toHaveBeenCalled();
  });

  it("clamps limit to 100 maximum", async () => {
    airlineRepo.find.mockResolvedValue([]);
    await searchAirlines("test", 999);
    expect(airlineRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });

  it("clamps limit to 1 minimum", async () => {
    airlineRepo.find.mockResolvedValue([]);
    await searchAirlines("test", 0);
    expect(airlineRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ take: 1 }),
    );
  });
});

describe("listAirlines", () => {
  it("returns items and total with default params", async () => {
    const airlines = [makeAirline()];
    airlineRepo.findAndCount.mockResolvedValue([airlines, 1]);

    const result = await listAirlines();

    expect(result).toEqual({ items: airlines, total: 1 });
    expect(airlineRepo.findAndCount).toHaveBeenCalledWith({
      take: 50,
      skip: 0,
      order: { icaoCode: "ASC" },
    });
  });

  it("clamps limit to 200 maximum", async () => {
    airlineRepo.findAndCount.mockResolvedValue([[], 0]);
    await listAirlines(500);
    expect(airlineRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 }),
    );
  });

  it("clamps limit to 1 minimum", async () => {
    airlineRepo.findAndCount.mockResolvedValue([[], 0]);
    await listAirlines(0);
    expect(airlineRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ take: 1 }),
    );
  });

  it("clamps offset to 0 minimum", async () => {
    airlineRepo.findAndCount.mockResolvedValue([[], 0]);
    await listAirlines(50, -5);
    expect(airlineRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0 }),
    );
  });

  it("passes positive offset correctly", async () => {
    airlineRepo.findAndCount.mockResolvedValue([[], 0]);
    await listAirlines(10, 30);
    expect(airlineRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 30 }),
    );
  });
});

describe("createAirline", () => {
  const validInput = {
    icaoCode: "LOT",
    iataCode: "LO",
    name: "LOT Polish Airlines",
  };

  it("creates and returns airline", async () => {
    const created = makeAirline();
    airlineRepo.findOne.mockResolvedValue(null);
    airlineRepo.save.mockResolvedValue(created);

    const result = await createAirline(validInput);

    expect(result).toBe(created);
    expect(airlineRepo.save).toHaveBeenCalled();
  });

  it("normalizes icaoCode to uppercase", async () => {
    const created = makeAirline();
    airlineRepo.findOne.mockResolvedValue(null);
    airlineRepo.save.mockResolvedValue(created);

    await createAirline({ ...validInput, icaoCode: "lot" });

    expect(airlineRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ icaoCode: "LOT" }),
    );
  });

  it("normalizes iataCode to uppercase", async () => {
    const created = makeAirline();
    airlineRepo.findOne.mockResolvedValue(null);
    airlineRepo.save.mockResolvedValue(created);

    await createAirline({ ...validInput, iataCode: "lo" });

    expect(airlineRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ iataCode: "LO" }),
    );
  });

  it("stores null iataCode when not provided", async () => {
    const created = makeAirline({ iataCode: null });
    airlineRepo.findOne.mockResolvedValue(null);
    airlineRepo.save.mockResolvedValue(created);

    await createAirline({ icaoCode: "LOT", name: "LOT Polish Airlines" });

    expect(airlineRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ iataCode: null }),
    );
  });

  it("throws BadRequestError when ICAO is not exactly 3 characters", async () => {
    await expect(
      createAirline({ ...validInput, icaoCode: "LO" }),
    ).rejects.toThrow(BadRequestError);
    await expect(
      createAirline({ ...validInput, icaoCode: "LLOT" }),
    ).rejects.toThrow(BadRequestError);
  });

  it("throws BadRequestError when name is empty", async () => {
    await expect(createAirline({ ...validInput, name: "  " })).rejects.toThrow(
      BadRequestError,
    );
  });

  it("throws BadRequestError when airline already exists", async () => {
    airlineRepo.findOne.mockResolvedValue(makeAirline());
    await expect(createAirline(validInput)).rejects.toThrow(BadRequestError);
  });
});

describe("updateAirline", () => {
  it("throws NotFoundError when airline does not exist", async () => {
    airlineRepo.findOne.mockResolvedValue(null);
    await expect(updateAirline("XXX", { name: "New" })).rejects.toThrow(
      NotFoundError,
    );
  });

  it("updates name when provided", async () => {
    const existing = makeAirline();
    const updated = makeAirline({ name: "Renamed Airline" });
    airlineRepo.findOne.mockResolvedValue(existing);
    airlineRepo.save.mockResolvedValue(updated);

    const result = await updateAirline("LOT", { name: "Renamed Airline" });

    expect(airlineRepo.save).toHaveBeenCalled();
    expect(result).toBe(updated);
  });

  it("sets iataCode to null when passed as null", async () => {
    const existing = makeAirline();
    airlineRepo.findOne.mockResolvedValue(existing);
    airlineRepo.save.mockResolvedValue(makeAirline({ iataCode: null }));

    await updateAirline("LOT", { iataCode: null });

    expect(airlineRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ iataCode: null }),
    );
  });

  it("updates iataCode to uppercase when provided as string", async () => {
    const existing = makeAirline();
    airlineRepo.findOne.mockResolvedValue(existing);
    airlineRepo.save.mockResolvedValue(makeAirline({ iataCode: "LA" }));

    await updateAirline("LOT", { iataCode: "la" });

    expect(airlineRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ iataCode: "LA" }),
    );
  });

  it("trims name whitespace", async () => {
    const existing = makeAirline();
    airlineRepo.findOne.mockResolvedValue(existing);
    airlineRepo.save.mockResolvedValue(makeAirline({ name: "Trimmed Name" }));

    await updateAirline("LOT", { name: "  Trimmed Name  " });

    expect(airlineRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Trimmed Name" }),
    );
  });
});

describe("deleteAirline", () => {
  it("deletes airline successfully", async () => {
    airlineRepo.delete.mockResolvedValue({ affected: 1 });
    await expect(deleteAirline("LOT")).resolves.toBeUndefined();
    expect(airlineRepo.delete).toHaveBeenCalledWith({ icaoCode: "LOT" });
  });

  it("normalizes code before deletion", async () => {
    airlineRepo.delete.mockResolvedValue({ affected: 1 });
    await deleteAirline("lot");
    expect(airlineRepo.delete).toHaveBeenCalledWith({ icaoCode: "LOT" });
  });

  it("throws NotFoundError when no rows affected", async () => {
    airlineRepo.delete.mockResolvedValue({ affected: 0 });
    await expect(deleteAirline("XXX")).rejects.toThrow(NotFoundError);
  });
});

describe("getOrFetchAirline", () => {
  it("returns local airline without calling AeroAPI when found in DB", async () => {
    const airline = makeAirline();
    airlineRepo.findOne.mockResolvedValue(airline);

    const result = await getOrFetchAirline("LOT");

    expect(result).toBe(airline);
    expect(mockGetAeroApiClient).not.toHaveBeenCalled();
  });

  it("fetches from AeroAPI and persists when not in DB", async () => {
    const operatorInfo = {
      icao: "LOT",
      iata: "LO",
      name: "LOT Polish Airlines",
    };
    const persisted = makeAirline();

    airlineRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(persisted);
    airlineRepo.save.mockResolvedValue(undefined);

    const mockClient = {
      getOperatorInfo: jest.fn().mockResolvedValue(operatorInfo),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);

    const result = await getOrFetchAirline("LOT");

    expect(mockClient.getOperatorInfo).toHaveBeenCalledWith("LOT");
    expect(airlineRepo.save).toHaveBeenCalled();
    expect(result).toBe(persisted);
  });

  it("normalizes ICAO and IATA codes from AeroAPI response", async () => {
    const operatorInfo = {
      icao: "lot",
      iata: "lo",
      name: "LOT Polish Airlines",
    };
    const persisted = makeAirline();

    airlineRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(persisted);
    airlineRepo.save.mockResolvedValue(undefined);

    const mockClient = {
      getOperatorInfo: jest.fn().mockResolvedValue(operatorInfo),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);

    await getOrFetchAirline("lot");

    expect(airlineRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ icaoCode: "LOT", iataCode: "LO" }),
    );
  });

  it("throws NotFoundError when airline not in DB and AeroAPI returns 404", async () => {
    airlineRepo.findOne.mockResolvedValue(null);
    const mockClient = {
      getOperatorInfo: jest
        .fn()
        .mockRejectedValue(
          new AeroAPIError("Not Found", "/operators/XXX", 404, null),
        ),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);

    await expect(getOrFetchAirline("XXX")).rejects.toThrow(NotFoundError);
  });

  it("throws UpstreamError when AeroAPI returns non-404 error", async () => {
    airlineRepo.findOne.mockResolvedValue(null);
    const mockClient = {
      getOperatorInfo: jest
        .fn()
        .mockRejectedValue(
          new AeroAPIError("Service Unavailable", "/operators/LOT", 503, null),
        ),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);

    await expect(getOrFetchAirline("LOT")).rejects.toThrow(UpstreamError);
  });
});
