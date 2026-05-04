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
      country: { isoCode: "US", name: "United States", cities: [] } as Country,
      airports: [],
    } as City,
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

beforeEach(() => {
  airportRepo = makeRepo();
  airlineRepo = makeRepo();

  airlineRepo.find.mockResolvedValue([]);
  airportRepo.find.mockResolvedValue([]);

  mockGetRepository.mockImplementation((entity: unknown) => {
    if (entity === Airport) return airportRepo;
    if (entity === Airline) return airlineRepo;
    return makeRepo();
  });
});

describe("getAirportRoutes", () => {
  it("returns empty array when AeroAPI returns no schedules", async () => {
    const mockClient = {
      getScheduledFlights: jest.fn().mockResolvedValue({ scheduled: [] }),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);

    const result = await getAirportRoutes("AA01");

    expect(result).toEqual([]);
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

    const result = await getAirportRoutes("AA02");

    expect(result).toHaveLength(1);
    expect(result[0].airline.icaoCode).toBe("UAL");
    expect(result[0].destinations).toHaveLength(1);
    expect(result[0].destinations[0].icaoCode).toBe("KJFK");
  });

  it("skips schedules where destination equals origin airport", async () => {
    const mockClient = {
      getScheduledFlights: jest.fn().mockResolvedValue({
        scheduled: [
          {
            actual_ident_icao: "UAL123",
            destination_icao: "AA03",
          },
        ],
      }),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);

    const result = await getAirportRoutes("AA03");

    expect(result).toEqual([]);
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
        .mockRejectedValue(new AeroAPIError("Not Found", "/schedules", 404, null)),
    };
    mockGetAeroApiClient.mockReturnValue(mockClientForFetch);

    airportRepo.find.mockResolvedValue([makeAirport("KJFK")]);

    const result = await getAirportRoutes("AA04");

    expect(result).toEqual([]);
  });

  it("returns cached result on second call without calling AeroAPI again", async () => {
    const mockClient = {
      getScheduledFlights: jest.fn().mockResolvedValue({ scheduled: [] }),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);

    const first = await getAirportRoutes("AA05");
    const second = await getAirportRoutes("AA05");

    expect(second).toBe(first);
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

    const p1 = getAirportRoutes("AA06");
    const p2 = getAirportRoutes("AA06");

    resolveSchedules(undefined);
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(mockClient.getScheduledFlights).toHaveBeenCalledTimes(1);
    expect(r1).toBe(r2);
  });

  it("caches empty array when AeroAPI returns 404", async () => {
    const mockClient = {
      getScheduledFlights: jest
        .fn()
        .mockRejectedValue(new AeroAPIError("Not Found", "/schedules", 404, null)),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);

    const result = await getAirportRoutes("AA07");

    expect(result).toEqual([]);

    const resultCached = await getAirportRoutes("AA07");
    expect(resultCached).toEqual([]);
    expect(mockClient.getScheduledFlights).toHaveBeenCalledTimes(1);
  });

  it("throws UpstreamError when AeroAPI returns 429 rate limit", async () => {
    const mockClient = {
      getScheduledFlights: jest
        .fn()
        .mockRejectedValue(new AeroAPIError("Too Many Requests", "/schedules", 429, null)),
    };
    mockGetAeroApiClient.mockReturnValue(mockClient);

    await expect(getAirportRoutes("AA08")).rejects.toThrow(UpstreamError);
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

    const result = await getAirportRoutes("AA09");

    expect(result[0].airline.name).toBe("Alpha Air");
    expect(result[1].airline.name).toBe("Zebra Air");
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

    const result = await getAirportRoutes("AA10");

    expect(result).toHaveLength(1);
    expect(result[0].destinations[0].icaoCode).toBe("KLAX");
  });
});
