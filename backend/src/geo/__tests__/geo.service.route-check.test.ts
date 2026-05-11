jest.mock("../../common/database/data-source", () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

jest.mock("../../common/integrations/aeroapi", () => {
  const actual = jest.requireActual("../../common/integrations/aeroapi");
  return { getAeroApiClient: jest.fn(), AeroAPIError: actual.AeroAPIError };
});

import { getRouteCheck } from "../geo.service";
import { Airport } from "../entities/Airport";
import { Airline } from "../entities/Airline";
import { AirportRoute } from "../entities/AirportRoute";
import { City } from "../entities/City";
import { Country } from "../entities/Country";
import { Point } from "geojson";

import { AppDataSource } from "../../common/database/data-source";

const mockGetRepository = AppDataSource.getRepository as jest.Mock;

function makeQueryBuilder(overrides: { getMany?: jest.Mock } = {}) {
  const qb: Record<string, jest.Mock> = {};
  qb.select = jest.fn().mockReturnValue(qb);
  qb.where = jest.fn().mockReturnValue(qb);
  qb.andWhere = jest.fn().mockReturnValue(qb);
  qb.innerJoinAndSelect = jest.fn().mockReturnValue(qb);
  qb.leftJoinAndSelect = jest.fn().mockReturnValue(qb);
  qb.getRawOne = jest.fn().mockResolvedValue({ maxFetchedAt: null });
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
      countryCode: "PL",
      country: {
        isoCode: "PL",
        name: "Poland",
        cities: [],
      } as unknown as Country,
      airports: [],
    } as unknown as City,
    location: { type: "Point", coordinates: [20.96, 52.17] } as Point,
    timezone: "Europe/Warsaw",
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
  routeRepo.find.mockResolvedValue([]);

  mockGetRepository.mockImplementation((entity: unknown) => {
    if (entity === Airport) return airportRepo;
    if (entity === Airline) return airlineRepo;
    if (entity === AirportRoute) return routeRepo;
    return makeRepo();
  });
});

describe("getRouteCheck", () => {
  it("returns empty direct and connecting when no routes in DB", async () => {
    const result = await getRouteCheck("RC01", "RC02");

    expect(result.originIcao).toBe("RC01");
    expect(result.destinationIcao).toBe("RC02");
    expect(result.direct).toEqual([]);
    expect(result.connecting).toEqual([]);
  });

  it("returns direct routes found in airport_routes table", async () => {
    const route = makeDbRoute("RC03", "LOT", "RC04");
    route.airline.name = "LOT Polish Airlines";
    routeRepo._qb.getMany.mockResolvedValue([route]);

    const result = await getRouteCheck("RC03", "RC04");

    expect(result.direct).toHaveLength(1);
    expect(result.direct[0].airlineIcao).toBe("LOT");
    expect(result.direct[0].airlineName).toBe("LOT Polish Airlines");
    expect(result.connecting).toEqual([]);
  });

  it("returns connecting stops via set intersection of leg1 destinations and leg2 origins", async () => {
    routeRepo.find
      .mockResolvedValueOnce([{ destinationAirportCode: "EDDF" }])
      .mockResolvedValueOnce([{ originAirportCode: "EDDF" }]);

    const stop = makeAirport("EDDF");
    stop.name = "Frankfurt Airport";
    stop.city = {
      id: 2,
      name: "Frankfurt",
      countryCode: "DE",
      country: {
        isoCode: "DE",
        name: "Germany",
        cities: [],
      } as unknown as Country,
      airports: [],
    } as unknown as City;
    airportRepo.find.mockResolvedValue([stop]);

    const result = await getRouteCheck("RC05", "RC06");

    expect(result.connecting).toHaveLength(1);
    expect(result.connecting[0].stopAirportIcao).toBe("EDDF");
    expect(result.connecting[0].stopCityName).toBe("Frankfurt");
    expect(result.connecting[0].stopLatitude).toBe(52.17);
    expect(result.connecting[0].stopLongitude).toBe(20.96);
  });

  it("excludes origin and destination airports from connecting stops", async () => {
    routeRepo.find
      .mockResolvedValueOnce([
        { destinationAirportCode: "EDDF" },
        { destinationAirportCode: "RC08" },
        { destinationAirportCode: "RC07" },
      ])
      .mockResolvedValueOnce([
        { originAirportCode: "EDDF" },
        { originAirportCode: "RC08" },
        { originAirportCode: "RC07" },
      ]);

    airportRepo.find.mockResolvedValue([makeAirport("EDDF")]);

    const result = await getRouteCheck("RC07", "RC08");

    expect(result.connecting).toHaveLength(1);
    expect(result.connecting[0].stopAirportIcao).toBe("EDDF");
  });

  it("returns empty connecting when leg1 and leg2 share no airport", async () => {
    routeRepo.find
      .mockResolvedValueOnce([{ destinationAirportCode: "EDDF" }])
      .mockResolvedValueOnce([{ originAirportCode: "LEMD" }]);

    const result = await getRouteCheck("RC09", "RC10");

    expect(result.connecting).toEqual([]);
    expect(airportRepo.find).not.toHaveBeenCalled();
  });

  it("caches result and skips DB on second call with same pair", async () => {
    await getRouteCheck("RC11", "RC12");

    routeRepo._qb.getMany.mockClear();
    routeRepo.find.mockClear();

    await getRouteCheck("RC11", "RC12");

    expect(routeRepo._qb.getMany).not.toHaveBeenCalled();
    expect(routeRepo.find).not.toHaveBeenCalled();
  });
});
