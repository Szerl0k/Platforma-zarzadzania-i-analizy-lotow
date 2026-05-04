import {
  findAirportInDb,
  searchAirports,
  listAirports,
  listAirportsInArea,
  createAirport,
  updateAirport,
  deleteAirport,
  getOrFetchAirport,
  BadRequestError,
  NotFoundError,
  UpstreamError,
} from "../geo.service";
import { Airport } from "../entities/Airport";
import { Airline } from "../entities/Airline";
import { City } from "../entities/City";
import { Country } from "../entities/Country";
import { Point } from "geojson";

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

let airportRepo: ReturnType<typeof makeRepo>;
let airlineRepo: ReturnType<typeof makeRepo>;
let cityRepo: ReturnType<typeof makeRepo>;
let countryRepo: ReturnType<typeof makeRepo>;

function makeAirport(overrides: Partial<Airport> = {}): Airport {
  return {
    icaoCode: "EPWA",
    iataCode: "WAW",
    name: "Warsaw Chopin",
    cityId: 1,
    city: {
      id: 1,
      name: "Warsaw",
      countryCode: "PL",
      country: {
        isoCode: "PL",
        name: "Poland",
        cities: [],
      } as unknown as Country,
      airports: [],
    } as unknown as City,
    location: { type: "Point", coordinates: [20.967, 52.165] } as Point,
    timezone: "Europe/Warsaw",
    ...overrides,
  } as unknown as Airport;
}

function makeQueryBuilder(results: Airport[] = []) {
  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(results),
  };
  return qb;
}

beforeEach(() => {
  airportRepo = makeRepo();
  airlineRepo = makeRepo();
  cityRepo = makeRepo();
  countryRepo = makeRepo();

  mockGetRepository.mockImplementation((entity: unknown) => {
    if (entity === Airport) return airportRepo;
    if (entity === Airline) return airlineRepo;
    if (entity === City) return cityRepo;
    if (entity === Country) return countryRepo;
  });
});

describe("findAirportInDb", () => {
  it("returns airport when found by ICAO code", async () => {
    const airport = makeAirport();
    airportRepo.findOne.mockResolvedValue(airport);

    const result = await findAirportInDb("EPWA");

    expect(result).toBe(airport);
    expect(airportRepo.findOne).toHaveBeenCalledWith({
      where: [{ icaoCode: "EPWA" }, { iataCode: "EPWA" }],
      relations: ["city", "city.country"],
    });
  });

  it("normalizes code to uppercase before querying", async () => {
    airportRepo.findOne.mockResolvedValue(null);

    await findAirportInDb("epwa");

    expect(airportRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: [{ icaoCode: "EPWA" }, { iataCode: "EPWA" }],
      }),
    );
  });

  it("returns null when airport not found", async () => {
    airportRepo.findOne.mockResolvedValue(null);
    expect(await findAirportInDb("XXXX")).toBeNull();
  });

  it("trims whitespace from code", async () => {
    airportRepo.findOne.mockResolvedValue(null);
    await findAirportInDb("  WAW  ");
    expect(airportRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: [{ icaoCode: "WAW" }, { iataCode: "WAW" }],
      }),
    );
  });
});

describe("searchAirports", () => {
  it("returns empty array for empty query string", async () => {
    expect(await searchAirports("")).toEqual([]);
    expect(airportRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it("returns empty array for whitespace-only query", async () => {
    expect(await searchAirports("   ")).toEqual([]);
  });

  it("returns matching airports from query builder", async () => {
    const airports = [makeAirport()];
    const qb = makeQueryBuilder(airports);
    airportRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await searchAirports("Warsaw");

    expect(result).toBe(airports);
    expect(qb.getMany).toHaveBeenCalled();
  });

  it("clamps limit to 100 maximum", async () => {
    const qb = makeQueryBuilder([]);
    airportRepo.createQueryBuilder.mockReturnValue(qb);

    await searchAirports("test", 999);

    expect(qb.take).toHaveBeenCalledWith(100);
  });

  it("clamps limit to 1 minimum", async () => {
    const qb = makeQueryBuilder([]);
    airportRepo.createQueryBuilder.mockReturnValue(qb);

    await searchAirports("test", 0);

    expect(qb.take).toHaveBeenCalledWith(1);
  });
});

describe("listAirports", () => {
  it("returns items and total with default params", async () => {
    const airports = [makeAirport()];
    airportRepo.findAndCount.mockResolvedValue([airports, 1]);

    const result = await listAirports();

    expect(result).toEqual({ items: airports, total: 1 });
    expect(airportRepo.findAndCount).toHaveBeenCalledWith({
      relations: ["city", "city.country"],
      take: 50,
      skip: 0,
      order: { icaoCode: "ASC" },
    });
  });

  it("clamps limit to 200 maximum", async () => {
    airportRepo.findAndCount.mockResolvedValue([[], 0]);
    await listAirports(500);
    expect(airportRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 }),
    );
  });

  it("clamps limit to 1 minimum", async () => {
    airportRepo.findAndCount.mockResolvedValue([[], 0]);
    await listAirports(0);
    expect(airportRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ take: 1 }),
    );
  });

  it("clamps offset to 0 minimum", async () => {
    airportRepo.findAndCount.mockResolvedValue([[], 0]);
    await listAirports(50, -10);
    expect(airportRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0 }),
    );
  });

  it("passes positive offset correctly", async () => {
    airportRepo.findAndCount.mockResolvedValue([[], 0]);
    await listAirports(20, 40);
    expect(airportRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20, skip: 40 }),
    );
  });
});

describe("listAirportsInArea", () => {
  it("queries with ST_Within using provided bounds", async () => {
    const qb = makeQueryBuilder([makeAirport()]);
    airportRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await listAirportsInArea(14.0, 49.0, 24.0, 55.0);

    expect(result).toHaveLength(1);
    expect(qb.where).toHaveBeenCalledWith(
      "ST_Within(airport.location, ST_MakeEnvelope(:lomin, :lamin, :lomax, :lamax, 4326))",
      { lomin: 14.0, lamin: 49.0, lomax: 24.0, lamax: 55.0 },
    );
  });

  it("clamps limit to 500 maximum", async () => {
    const qb = makeQueryBuilder([]);
    airportRepo.createQueryBuilder.mockReturnValue(qb);

    await listAirportsInArea(0, 0, 1, 1, 1000);

    expect(qb.take).toHaveBeenCalledWith(500);
  });

  it("clamps limit to 1 minimum", async () => {
    const qb = makeQueryBuilder([]);
    airportRepo.createQueryBuilder.mockReturnValue(qb);

    await listAirportsInArea(0, 0, 1, 1, -5);

    expect(qb.take).toHaveBeenCalledWith(1);
  });
});

describe("createAirport", () => {
  const validInput = {
    icaoCode: "EPWA",
    iataCode: "WAW",
    name: "Warsaw Chopin",
    latitude: 52.165,
    longitude: 20.967,
    timezone: "Europe/Warsaw",
    countryCode: "PL",
    cityName: "Warsaw",
  };

  function setupSuccessfulCreate(createdAirport: Airport) {
    airportRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createdAirport);
    countryRepo.findOne.mockResolvedValue({ isoCode: "PL", name: "Poland" });
    cityRepo.findOne.mockResolvedValue({
      id: 1,
      name: "Warsaw",
      countryCode: "PL",
    });
  }

  it("creates and returns airport with relations", async () => {
    const created = makeAirport();
    setupSuccessfulCreate(created);

    const result = await createAirport(validInput);

    expect(result).toBe(created);
    expect(airportRepo.save).toHaveBeenCalled();
  });

  it("normalizes icaoCode to uppercase", async () => {
    const created = makeAirport();
    setupSuccessfulCreate(created);

    await createAirport({ ...validInput, icaoCode: "epwa" });

    expect(airportRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ icaoCode: "EPWA" }),
    );
  });

  it("normalizes iataCode to uppercase", async () => {
    const created = makeAirport();
    setupSuccessfulCreate(created);

    await createAirport({ ...validInput, iataCode: "waw" });

    expect(airportRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ iataCode: "WAW" }),
    );
  });

  it("stores null iataCode when not provided", async () => {
    const created = makeAirport({ iataCode: null });
    setupSuccessfulCreate(created);

    await createAirport({ ...validInput, iataCode: undefined });

    expect(airportRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ iataCode: null }),
    );
  });

  it("creates city when it does not exist yet", async () => {
    const created = makeAirport();
    airportRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(created);
    countryRepo.findOne.mockResolvedValue({ isoCode: "PL", name: "Poland" });
    cityRepo.findOne.mockResolvedValue(null);
    cityRepo.save.mockResolvedValue({
      id: 99,
      name: "Warsaw",
      countryCode: "PL",
    });

    await createAirport(validInput);

    expect(cityRepo.save).toHaveBeenCalled();
  });

  it("throws BadRequestError when ICAO code is too short", async () => {
    await expect(
      createAirport({ ...validInput, icaoCode: "EP" }),
    ).rejects.toThrow(BadRequestError);
  });

  it("throws BadRequestError when ICAO code is too long", async () => {
    await expect(
      createAirport({ ...validInput, icaoCode: "EPWAA" }),
    ).rejects.toThrow(BadRequestError);
  });

  it("throws BadRequestError when name is empty", async () => {
    await expect(createAirport({ ...validInput, name: "  " })).rejects.toThrow(
      BadRequestError,
    );
  });

  it("throws BadRequestError when latitude is missing", async () => {
    await expect(
      createAirport({
        ...validInput,
        latitude: undefined as unknown as number,
      }),
    ).rejects.toThrow(BadRequestError);
  });

  it("throws BadRequestError when longitude is missing", async () => {
    await expect(
      createAirport({
        ...validInput,
        longitude: undefined as unknown as number,
      }),
    ).rejects.toThrow(BadRequestError);
  });

  it("throws BadRequestError when timezone is empty", async () => {
    await expect(
      createAirport({ ...validInput, timezone: "" }),
    ).rejects.toThrow(BadRequestError);
  });

  it("throws BadRequestError when countryCode is missing", async () => {
    await expect(
      createAirport({ ...validInput, countryCode: "" }),
    ).rejects.toThrow(BadRequestError);
  });

  it("throws BadRequestError when cityName is missing", async () => {
    await expect(
      createAirport({ ...validInput, cityName: "" }),
    ).rejects.toThrow(BadRequestError);
  });

  it("throws BadRequestError when airport already exists", async () => {
    airportRepo.findOne.mockResolvedValueOnce(makeAirport());

    await expect(createAirport(validInput)).rejects.toThrow(BadRequestError);
  });

  it("throws BadRequestError when country code is unknown", async () => {
    airportRepo.findOne.mockResolvedValueOnce(null);
    countryRepo.findOne.mockResolvedValue(null);

    await expect(createAirport(validInput)).rejects.toThrow(BadRequestError);
  });

  it("handles 23505 race on city creation by re-fetching the existing city", async () => {
    const created = makeAirport();
    const refetchedCity = { id: 1, name: "Warsaw", countryCode: "PL" };

    airportRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(created);
    countryRepo.findOne.mockResolvedValue({ isoCode: "PL", name: "Poland" });
    cityRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(refetchedCity);
    cityRepo.save.mockRejectedValue(
      Object.assign(new Error("duplicate city"), { code: "23505" }),
    );
    airportRepo.save.mockResolvedValue(undefined);

    const result = await createAirport(validInput);

    expect(result).toBe(created);
    expect(cityRepo.findOne).toHaveBeenCalledTimes(2);
  });
});

describe("updateAirport", () => {
  it("throws NotFoundError when airport does not exist", async () => {
    airportRepo.findOne.mockResolvedValueOnce(null);
    await expect(updateAirport("XXXX", { name: "New Name" })).rejects.toThrow(
      NotFoundError,
    );
  });

  it("updates name when provided", async () => {
    const existing = makeAirport();
    const updated = makeAirport({ name: "New Name" });
    airportRepo.findOne
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(updated);

    const result = await updateAirport("EPWA", { name: "New Name" });

    expect(airportRepo.save).toHaveBeenCalled();
    expect(result).toBe(updated);
  });

  it("sets iataCode to null when explicitly passed as null", async () => {
    const existing = makeAirport();
    airportRepo.findOne
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(makeAirport({ iataCode: null }));

    await updateAirport("EPWA", { iataCode: null });

    expect(airportRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ iataCode: null }),
    );
  });

  it("updates iataCode to uppercase when provided as string", async () => {
    const existing = makeAirport();
    airportRepo.findOne
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(makeAirport({ iataCode: "WMI" }));

    await updateAirport("EPWA", { iataCode: "wmi" });

    expect(airportRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ iataCode: "WMI" }),
    );
  });

  it("updates only latitude when longitude not provided", async () => {
    const existing = makeAirport();
    airportRepo.findOne
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(existing);

    await updateAirport("EPWA", { latitude: 53.0 });

    expect(airportRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        location: { type: "Point", coordinates: [20.967, 53.0] },
      }),
    );
  });

  it("updates city when countryCode and cityName provided", async () => {
    const existing = makeAirport();
    const newCity = { id: 2, name: "Krakow", countryCode: "PL" };
    airportRepo.findOne
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(makeAirport({ cityId: 2 }));
    countryRepo.findOne.mockResolvedValue({ isoCode: "PL", name: "Poland" });
    cityRepo.findOne.mockResolvedValue(newCity);

    await updateAirport("EPWA", { countryCode: "PL", cityName: "Krakow" });

    expect(airportRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ cityId: 2 }),
    );
  });
});

describe("deleteAirport", () => {
  it("deletes airport successfully", async () => {
    airportRepo.delete.mockResolvedValue({ affected: 1 });
    await expect(deleteAirport("EPWA")).resolves.toBeUndefined();
    expect(airportRepo.delete).toHaveBeenCalledWith({ icaoCode: "EPWA" });
  });

  it("normalizes code before deletion", async () => {
    airportRepo.delete.mockResolvedValue({ affected: 1 });
    await deleteAirport("epwa");
    expect(airportRepo.delete).toHaveBeenCalledWith({ icaoCode: "EPWA" });
  });

  it("throws NotFoundError when no rows affected", async () => {
    airportRepo.delete.mockResolvedValue({ affected: 0 });
    await expect(deleteAirport("XXXX")).rejects.toThrow(NotFoundError);
  });
});

describe("getOrFetchAirport", () => {
  it("returns local airport without calling AeroAPI when found in DB", async () => {
    const airport = makeAirport();
    airportRepo.findOne.mockResolvedValue(airport);

    const result = await getOrFetchAirport("EPWA");

    expect(result).toBe(airport);
    expect(mockGetAeroApiClient).not.toHaveBeenCalled();
  });

  it("fetches from AeroAPI and persists when not in DB", async () => {
    const aeroInfo = {
      airport_code: "EPWA",
      alternate_ident: "WAW",
      name: "Warsaw Chopin",
      city: "Warsaw",
      country_code: "PL",
      latitude: 52.165,
      longitude: 20.967,
      timezone: "Europe/Warsaw",
    };
    const persisted = makeAirport();

    airportRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(persisted);
    countryRepo.findOne.mockResolvedValue({ isoCode: "PL", name: "Poland" });
    cityRepo.findOne.mockResolvedValue({
      id: 1,
      name: "Warsaw",
      countryCode: "PL",
    });
    airportRepo.save.mockResolvedValue(undefined);

    const mockClient = {
      getAirportInfo: jest.fn().mockResolvedValue(aeroInfo),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);

    const result = await getOrFetchAirport("EPWA");

    expect(mockClient.getAirportInfo).toHaveBeenCalledWith("EPWA");
    expect(airportRepo.save).toHaveBeenCalled();
    expect(result).toBe(persisted);
  });

  it("throws NotFoundError when airport not in DB and AeroAPI returns 404", async () => {
    airportRepo.findOne.mockResolvedValue(null);
    const mockClient = {
      getAirportInfo: jest
        .fn()
        .mockRejectedValue(
          new AeroAPIError("Not Found", "/airports/XXXX", 404, null),
        ),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);

    await expect(getOrFetchAirport("XXXX")).rejects.toThrow(NotFoundError);
  });

  it("throws UpstreamError when AeroAPI returns non-404 error", async () => {
    airportRepo.findOne.mockResolvedValue(null);
    const mockClient = {
      getAirportInfo: jest
        .fn()
        .mockRejectedValue(
          new AeroAPIError("Server Error", "/airports/EPWA", 500, null),
        ),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);

    await expect(getOrFetchAirport("EPWA")).rejects.toThrow(UpstreamError);
  });

  it("resolves ICAO/IATA when primary code is IATA (3-char) and alternate is ICAO (4-char)", async () => {
    const aeroInfo = {
      airport_code: "WAW",
      alternate_ident: "EPWA",
      name: "Warsaw Chopin",
      city: "Warsaw",
      country_code: "PL",
      latitude: 52.165,
      longitude: 20.967,
      timezone: "Europe/Warsaw",
    };
    const persisted = makeAirport();

    airportRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(persisted);
    countryRepo.findOne.mockResolvedValue({ isoCode: "PL", name: "Poland" });
    cityRepo.findOne.mockResolvedValue({
      id: 1,
      name: "Warsaw",
      countryCode: "PL",
    });
    airportRepo.save.mockResolvedValue(undefined);

    const mockClient = {
      getAirportInfo: jest.fn().mockResolvedValue(aeroInfo),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);

    await getOrFetchAirport("WAW");

    expect(airportRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ icaoCode: "EPWA", iataCode: "WAW" }),
    );
  });
});
