jest.mock("../../common/database/data-source", () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

jest.mock("../../common/integrations/aeroapi", () => {
  const actual = jest.requireActual("../../common/integrations/aeroapi");
  return { getAeroApiClient: jest.fn(), AeroAPIError: actual.AeroAPIError };
});

import { getAirportRoutes, UpstreamError } from "../geo.service";
import { Airport } from "../entities/Airport";
import { Airline } from "../entities/Airline";
import { AirportRoute } from "../entities/AirportRoute";
import { City } from "../entities/City";
import { Country } from "../entities/Country";
import { Point } from "geojson";

import { AppDataSource } from "../../common/database/data-source";
import {
  getAeroApiClient,
  AeroAPIError,
} from "../../common/integrations/aeroapi";

const mockGetRepository = AppDataSource.getRepository as jest.Mock;
const mockGetAeroApiClient = getAeroApiClient as jest.Mock;

function makeQueryBuilder(
  overrides: {
    getRawOne?: jest.Mock;
    getMany?: jest.Mock;
  } = {},
) {
  const qb: Record<string, jest.Mock> = {};
  qb.select = jest.fn().mockReturnValue(qb);
  qb.where = jest.fn().mockReturnValue(qb);
  qb.andWhere = jest.fn().mockReturnValue(qb);
  qb.innerJoinAndSelect = jest.fn().mockReturnValue(qb);
  qb.leftJoinAndSelect = jest.fn().mockReturnValue(qb);
  qb.getRawOne =
    overrides.getRawOne ?? jest.fn().mockResolvedValue({ maxFetchedAt: null });
  qb.getMany = overrides.getMany ?? jest.fn().mockResolvedValue([]);
  return qb;
}

function makeRepo(qbOverrides: Parameters<typeof makeQueryBuilder>[0] = {}) {
  const qb = makeQueryBuilder(qbOverrides);
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    delete: jest.fn().mockResolvedValue({ affected: 0 }),
    insert: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockImplementation((data: unknown) => ({
      ...(data as object),
    })),
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    _qb: qb,
  };
}

let airportRepo: ReturnType<typeof makeRepo>;
let airlineRepo: ReturnType<typeof makeRepo>;
let routeRepo: ReturnType<typeof makeRepo>;

function makeAirport(icao: string): Airport {
  return {
    icaoCode: icao,
    iataCode: null,
    name: `Airport ${icao}`,
    cityId: 1,
    city: {
      id: 1,
      name: "City",
      countryCode: "US",
      country: {
        isoCode: "US",
        name: "United States",
        cities: [],
      } as unknown as Country,
      airports: [],
    } as unknown as City,
    location: { type: "Point", coordinates: [-73.78, 40.63] } as Point,
    timezone: "America/New_York",
  } as unknown as Airport;
}

function makeAirline(icao: string): Airline {
  return {
    icaoCode: icao,
    iataCode: null,
    name: `Airline ${icao}`,
  } as unknown as Airline;
}

function makeDbRoute(
  originIcao: string,
  airlineIcao: string,
  destIcao: string,
): AirportRoute {
  return {
    id: 1,
    originAirportCode: originIcao,
    airlineCode: airlineIcao,
    destinationAirportCode: destIcao,
    airline: makeAirline(airlineIcao),
    destinationAirport: makeAirport(destIcao),
    fetchedAt: new Date(),
  } as unknown as AirportRoute;
}

beforeEach(() => {
  airportRepo = makeRepo();
  airlineRepo = makeRepo();
  routeRepo = makeRepo();

  airlineRepo.find.mockResolvedValue([]);
  airportRepo.find.mockResolvedValue([]);

  mockGetRepository.mockImplementation((entity: unknown) => {
    if (entity === Airport) return airportRepo;
    if (entity === Airline) return airlineRepo;
    if (entity === AirportRoute) return routeRepo;
    return makeRepo();
  });
});

describe("getAirportRoutes", () => {
  it("returns empty array when AeroAPI returns no schedules", async () => {
    const mockClient = {
      getScheduledFlights: jest.fn().mockResolvedValue({ scheduled: [] }),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);

    const result = await getAirportRoutes("BA01");

    expect(result.routes).toEqual([]);
    expect(result.stale).toBe(false);
    expect(mockClient.getScheduledFlights).toHaveBeenCalledTimes(1);
  });

  it("builds RouteEntry array from schedules using DB-resident data", async () => {
    const destAirport = makeAirport("KJFK");
    const airline = makeAirline("UAL");

    const mockClient = {
      getScheduledFlights: jest.fn().mockResolvedValue({
        scheduled: [
          {
            actual_ident_icao: "UAL123",
            destination_icao: "KJFK",
          },
        ],
      }),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);

    airlineRepo.find.mockResolvedValue([airline]);
    airportRepo.find.mockResolvedValue([destAirport]);

    const result = await getAirportRoutes("BA02");

    expect(result.routes).toHaveLength(1);
    expect(result.routes[0].airline.icaoCode).toBe("UAL");
    expect(result.routes[0].destinations).toHaveLength(1);
    expect(result.routes[0].destinations[0].icaoCode).toBe("KJFK");
    expect(result.stale).toBe(false);
  });

  it("skips schedules where destination equals origin airport", async () => {
    const mockClient = {
      getScheduledFlights: jest.fn().mockResolvedValue({
        scheduled: [
          {
            actual_ident_icao: "UAL123",
            destination_icao: "BA03",
          },
        ],
      }),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);

    const result = await getAirportRoutes("BA03");

    expect(result.routes).toEqual([]);
  });

  it("skips routes whose operator ICAO has no matching airline", async () => {
    const mockClientForFetch = {
      getScheduledFlights: jest.fn().mockResolvedValue({
        scheduled: [
          {
            actual_ident_icao: "UAL123",
            destination_icao: "KJFK",
          },
        ],
      }),
      getOperatorInfo: jest
        .fn()
        .mockRejectedValue(
          new AeroAPIError("Not Found", "/schedules", 404, null),
        ),
    };
    mockGetAeroApiClient.mockReturnValue(mockClientForFetch);

    airportRepo.find.mockResolvedValue([makeAirport("KJFK")]);

    const result = await getAirportRoutes("BA04");

    expect(result.routes).toEqual([]);
  });

  it("returns cached result on second call without calling AeroAPI again", async () => {
    const mockClient = {
      getScheduledFlights: jest.fn().mockResolvedValue({ scheduled: [] }),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);

    const first = await getAirportRoutes("BA05");
    const second = await getAirportRoutes("BA05");

    expect(second.routes).toEqual(first.routes);
    expect(second.stale).toBe(first.stale);
    expect(mockClient.getScheduledFlights).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent in-flight requests to the same ICAO", async () => {
    let resolveSchedules!: (value: unknown) => void;
    const schedulePromise = new Promise((res) => {
      resolveSchedules = res;
    });

    const mockClient = {
      getScheduledFlights: jest
        .fn()
        .mockReturnValue(schedulePromise.then(() => ({ scheduled: [] }))),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);

    const p1 = getAirportRoutes("BA06");
    const p2 = getAirportRoutes("BA06");

    resolveSchedules(undefined);
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(mockClient.getScheduledFlights).toHaveBeenCalledTimes(1);
    expect(r1).toBe(r2);
  });

  it("caches empty array when AeroAPI returns 404", async () => {
    const mockClient = {
      getScheduledFlights: jest
        .fn()
        .mockRejectedValue(
          new AeroAPIError("Not Found", "/schedules", 404, null),
        ),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);

    const result = await getAirportRoutes("BA07");

    expect(result.routes).toEqual([]);
    expect(result.stale).toBe(false);

    const resultCached = await getAirportRoutes("BA07");
    expect(resultCached.routes).toEqual([]);
    expect(mockClient.getScheduledFlights).toHaveBeenCalledTimes(1);
  });

  it("throws UpstreamError when AeroAPI returns 429 rate limit and no DB data", async () => {
    const mockClient = {
      getScheduledFlights: jest
        .fn()
        .mockRejectedValue(
          new AeroAPIError("Too Many Requests", "/schedules", 429, null),
        ),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);

    await expect(getAirportRoutes("BA08")).rejects.toThrow(UpstreamError);
  });

  it("sorts route entries alphabetically by airline name", async () => {
    const airlineZ = makeAirline("ZZZ");
    airlineZ.name = "Zebra Air";
    const airlineA = makeAirline("AAR");
    airlineA.name = "Alpha Air";

    const mockClient = {
      getScheduledFlights: jest.fn().mockResolvedValue({
        scheduled: [
          { actual_ident_icao: "ZZZ001", destination_icao: "KJFK" },
          { actual_ident_icao: "AAR001", destination_icao: "KLAX" },
        ],
      }),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);

    airlineRepo.find.mockResolvedValue([airlineZ, airlineA]);
    airportRepo.find.mockResolvedValue([
      makeAirport("KJFK"),
      makeAirport("KLAX"),
    ]);

    const result = await getAirportRoutes("BA09");

    expect(result.routes[0].airline.name).toBe("Alpha Air");
    expect(result.routes[1].airline.name).toBe("Zebra Air");
  });

  it("uses destination field as fallback when destination_icao is absent", async () => {
    const destAirport = makeAirport("KLAX");
    const airline = makeAirline("DAL");

    const mockClient = {
      getScheduledFlights: jest.fn().mockResolvedValue({
        scheduled: [
          {
            actual_ident_icao: "DAL100",
            destination_icao: null,
            destination: "klax",
          },
        ],
      }),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);
    airlineRepo.find.mockResolvedValue([airline]);
    airportRepo.find.mockResolvedValue([destAirport]);

    const result = await getAirportRoutes("BA10");

    expect(result.routes).toHaveLength(1);
    expect(result.routes[0].destinations[0].icaoCode).toBe("KLAX");
  });

  it("returns routes from DB when data is fresh, skipping AeroAPI", async () => {
    const freshDate = new Date(Date.now() - 60 * 60 * 1000); // 1h ago
    routeRepo._qb.getRawOne.mockResolvedValue({
      maxFetchedAt: freshDate.toISOString(),
    });
    routeRepo._qb.getMany.mockResolvedValue([
      makeDbRoute("EPWA", "LOT", "EGLL"),
    ]);

    const mockClient = {
      getScheduledFlights: jest.fn(),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);

    const result = await getAirportRoutes("EPWA");

    expect(result.routes).toHaveLength(1);
    expect(result.routes[0].airline.icaoCode).toBe("LOT");
    expect(result.stale).toBe(false);
    expect(mockClient.getScheduledFlights).not.toHaveBeenCalled();
  });

  it("fetches from AeroAPI when DB data is stale, updates DB, returns fresh", async () => {
    const staleDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8d ago
    routeRepo._qb.getRawOne.mockResolvedValue({
      maxFetchedAt: staleDate.toISOString(),
    });

    const mockClient = {
      getScheduledFlights: jest.fn().mockResolvedValue({
        scheduled: [{ actual_ident_icao: "RYR123", destination_icao: "LEMD" }],
      }),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);
    airlineRepo.find.mockResolvedValue([makeAirline("RYR")]);
    airportRepo.find.mockResolvedValue([makeAirport("LEMD")]);

    const result = await getAirportRoutes("EIDW");

    expect(mockClient.getScheduledFlights).toHaveBeenCalledTimes(1);
    expect(routeRepo.delete).toHaveBeenCalledWith({
      originAirportCode: "EIDW",
    });
    expect(routeRepo.insert).toHaveBeenCalled();
    expect(result.stale).toBe(false);
    expect(result.routes).toHaveLength(1);
  });

  it("returns stale DB data with stale=true when AeroAPI is down and DB has old routes", async () => {
    const staleDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8d ago
    routeRepo._qb.getRawOne.mockResolvedValue({
      maxFetchedAt: staleDate.toISOString(),
    });
    routeRepo._qb.getMany.mockResolvedValue([
      makeDbRoute("EFHK", "FIN", "EGLL"),
    ]);

    const mockClient = {
      getScheduledFlights: jest
        .fn()
        .mockRejectedValue(
          new AeroAPIError("Too Many Requests", "/schedules", 429, null),
        ),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);

    const result = await getAirportRoutes("EFHK");

    expect(result.stale).toBe(true);
    expect(result.routes).toHaveLength(1);
    expect(result.routes[0].airline.icaoCode).toBe("FIN");
  });

  it("persists routes to DB after successful AeroAPI fetch", async () => {
    const mockClient = {
      getScheduledFlights: jest.fn().mockResolvedValue({
        scheduled: [
          { actual_ident_icao: "DLH100", destination_icao: "EGLL" },
          { actual_ident_icao: "DLH101", destination_icao: "LEMD" },
        ],
      }),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);
    airlineRepo.find.mockResolvedValue([makeAirline("DLH")]);
    airportRepo.find.mockResolvedValue([
      makeAirport("EGLL"),
      makeAirport("LEMD"),
    ]);

    await getAirportRoutes("EDDM");

    expect(routeRepo.delete).toHaveBeenCalledWith({
      originAirportCode: "EDDM",
    });
    expect(routeRepo.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          originAirportCode: "EDDM",
          airlineCode: "DLH",
        }),
      ]),
    );
  });
});
