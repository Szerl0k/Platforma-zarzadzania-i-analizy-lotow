import { __testing__, CityBreakService } from "../city-break.service";
import { haversineDistanceKm } from "../../common/utils/geo";
import { AppDataSource } from "../../common/database/data-source";
import { Airport } from "../../geo/entities/Airport";
import * as geoService from "../../geo/geo.service";
import * as aeroIntegration from "../../common/integrations/aeroapi";
import { AeroAPIError } from "../../common/integrations/aeroapi";
import { BadRequestError, NotFoundError } from "../../common/errors/http-errors";
import { CityBreakProposalDTO, SearchCityBreakQuery } from "../city-break.dto";

jest.mock("../../common/database/data-source", () => ({
  AppDataSource: { getRepository: jest.fn() },
}));
jest.mock("../../geo/geo.service");
jest.mock("../../common/integrations/aeroapi", () => {
  class AeroAPIError extends Error {
    status: number | null;
    endpoint: string;
    responseBody: unknown;
    constructor(
      message: string,
      endpoint: string,
      status: number | null,
      responseBody: unknown,
    ) {
      super(message);
      this.endpoint = endpoint;
      this.status = status;
      this.responseBody = responseBody;
    }
  }
  return {
    AeroAPIError,
    getAeroApiClient: jest.fn(),
  };
});

const mockedGetRepository = AppDataSource.getRepository as jest.Mock;
const mockedFindAirportInDb = geoService.findAirportInDb as jest.Mock;
const mockedGetAeroApiClient = aeroIntegration.getAeroApiClient as unknown as jest.Mock;

function makeAirport(overrides: Partial<Airport> = {}): Airport {
  return {
    icaoCode: "EPWA",
    iataCode: "WAW",
    name: "Warsaw Chopin",
    cityId: 1,
    location: { type: "Point", coordinates: [21.0, 52.16] },
    timezone: "Europe/Warsaw",
    city: {
      id: 1,
      name: "Warszawa",
      countryCode: "PL",
      country: { isoCode: "PL", name: "Polska" } as any,
    } as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Airport;
}

function makeSchedule(overrides: Partial<any> = {}) {
  return {
    ident: "LH456",
    actual_ident_iata: "LH456",
    actual_ident_icao: "DLH456",
    scheduled_out: "2026-05-20T08:00:00Z",
    scheduled_in: "2026-05-20T10:00:00Z",
    origin_icao: "EPWA",
    destination_icao: "EDDF",
    ...overrides,
  };
}

describe("city-break service helpers", () => {
  it("aggregates schedules by destination", () => {
    const aggregates = __testing__.aggregateByDestination(
      [
        makeSchedule({
          destination_icao: "EDDF",
          scheduled_out: "2026-05-20T08:00:00Z",
          scheduled_in: "2026-05-20T10:00:00Z",
          actual_ident_iata: "LH456",
        }),
        makeSchedule({
          destination_icao: "EDDF",
          scheduled_out: "2026-05-21T08:00:00Z",
          scheduled_in: "2026-05-21T09:30:00Z",
          actual_ident_iata: "LH458",
        }),
        makeSchedule({
          destination_icao: "LIRF",
          scheduled_out: "2026-05-20T07:00:00Z",
          scheduled_in: "2026-05-20T10:00:00Z",
          actual_ident_iata: "AZ100",
        }),
        makeSchedule({
          destination_icao: "EPWA",
          actual_ident_iata: "PT001",
        }),
      ],
      "EPWA",
    );
    expect(aggregates.size).toBe(2);
    const eddf = aggregates.get("EDDF")!;
    expect(eddf.flightCount).toBe(2);
    expect(eddf.minDurationMinutes).toBe(90);
    expect([...eddf.airlines].sort()).toEqual(["LH"]);
  });

  it("filters by max flight hours and excluded countries", () => {
    const proposals: CityBreakProposalDTO[] = [
      {
        destinationIcao: "EDDF",
        destinationIata: "FRA",
        cityName: "Frankfurt",
        countryName: "Niemcy",
        countryCode: "DE",
        airportName: "Frankfurt am Main",
        minFlightDurationMinutes: 90,
        flightCount: 4,
        airlines: ["LH"],
        distanceKm: 900,
      },
      {
        destinationIcao: "LIRF",
        destinationIata: "FCO",
        cityName: "Rzym",
        countryName: "Włochy",
        countryCode: "IT",
        airportName: "Roma Fiumicino",
        minFlightDurationMinutes: 180,
        flightCount: 1,
        airlines: ["AZ"],
        distanceKm: 1500,
      },
    ];
    const filtered = __testing__.applyFilters(proposals, {
      origin: "EPWA",
      dateFrom: "2026-05-15",
      dateTo: "2026-05-22",
      maxFlightHours: 2,
      sortBy: "flightTime",
    } as SearchCityBreakQuery);
    expect(filtered.map((p) => p.destinationIcao)).toEqual(["EDDF"]);

    const excluded = __testing__.applyFilters(proposals, {
      origin: "EPWA",
      dateFrom: "2026-05-15",
      dateTo: "2026-05-22",
      excludeCountryCodes: ["DE"],
      sortBy: "flightTime",
    } as SearchCityBreakQuery);
    expect(excluded.map((p) => p.destinationIcao)).toEqual(["LIRF"]);
  });

  it("sorts by popularity desc and flight time asc", () => {
    const proposals: CityBreakProposalDTO[] = [
      {
        destinationIcao: "AAA",
        destinationIata: null,
        cityName: null,
        countryName: null,
        countryCode: null,
        airportName: "AAA",
        minFlightDurationMinutes: 200,
        flightCount: 10,
        airlines: [],
        distanceKm: null,
      },
      {
        destinationIcao: "BBB",
        destinationIata: null,
        cityName: null,
        countryName: null,
        countryCode: null,
        airportName: "BBB",
        minFlightDurationMinutes: 100,
        flightCount: 2,
        airlines: [],
        distanceKm: null,
      },
    ];
    expect(
      __testing__
        .sortProposals(proposals, "flightTime")
        .map((p) => p.destinationIcao),
    ).toEqual(["BBB", "AAA"]);
    expect(
      __testing__
        .sortProposals(proposals, "popularity")
        .map((p) => p.destinationIcao),
    ).toEqual(["AAA", "BBB"]);
  });

  it("haversine returns reasonable distance Warsaw->Frankfurt", () => {
    const km = haversineDistanceKm(52.16, 21.0, 50.03, 8.57);
    expect(km).toBeGreaterThan(800);
    expect(km).toBeLessThan(1000);
  });
});

describe("CityBreakService.searchProposals", () => {
  const aeroClient = {
    getScheduledFlights: jest.fn(),
    getFlightsBetween: jest.fn(),
  };
  const airportRepo = { find: jest.fn(), createQueryBuilder: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAeroApiClient.mockReturnValue(aeroClient);
    mockedGetRepository.mockImplementation((entity: unknown) => {
      if (entity === Airport) return airportRepo;
      return { find: jest.fn(), findOne: jest.fn() };
    });
    mockedFindAirportInDb.mockImplementation(async (code: string) =>
      code === "EPWA" ? makeAirport() : null,
    );
    airportRepo.find.mockResolvedValue([
      makeAirport({
        icaoCode: "EDDF",
        iataCode: "FRA",
        name: "Frankfurt",
        location: { type: "Point", coordinates: [8.57, 50.03] },
        city: {
          id: 2,
          name: "Frankfurt",
          countryCode: "DE",
          country: { isoCode: "DE", name: "Niemcy" } as any,
        } as any,
      }),
    ]);
  });

  it("returns proposals enriched from DB", async () => {
    aeroClient.getScheduledFlights.mockResolvedValue({
      scheduled: [
        makeSchedule({ destination_icao: "EDDF" }),
        makeSchedule({
          destination_icao: "EDDF",
          scheduled_out: "2026-05-21T08:00:00Z",
          scheduled_in: "2026-05-21T09:30:00Z",
          actual_ident_iata: "LH458",
        }),
      ],
    });
    const service = new CityBreakService();
    const result = await service.searchProposals({
      origin: "EPWA",
      dateFrom: "2026-05-20",
      dateTo: "2026-05-22",
      sortBy: "flightTime",
    } as SearchCityBreakQuery);
    expect(result).toHaveLength(1);
    expect(result[0].destinationIcao).toBe("EDDF");
    expect(result[0].cityName).toBe("Frankfurt");
    expect(result[0].countryName).toBe("Niemcy");
    expect(result[0].minFlightDurationMinutes).toBe(90);
    expect(result[0].flightCount).toBe(2);
    expect(result[0].distanceKm).toBeGreaterThan(800);
  });

  it("returns empty array when AeroAPI returns no schedules", async () => {
    aeroClient.getScheduledFlights.mockResolvedValue({ scheduled: [] });
    const service = new CityBreakService();
    const result = await service.searchProposals({
      origin: "EPWA",
      dateFrom: "2026-06-01",
      dateTo: "2026-06-03",
      sortBy: "flightTime",
    } as SearchCityBreakQuery);
    expect(result).toEqual([]);
  });

  it("rejects when origin cannot be resolved", async () => {
    mockedFindAirportInDb.mockResolvedValue(null);
    const qb = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    airportRepo.createQueryBuilder.mockReturnValue(qb);
    const service = new CityBreakService();
    await expect(
      service.searchProposals({
        origin: "ZZZZ",
        dateFrom: "2026-07-01",
        dateTo: "2026-07-02",
        sortBy: "flightTime",
      } as SearchCityBreakQuery),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("wraps AeroAPI 404 as NotFoundError", async () => {
    aeroClient.getScheduledFlights.mockRejectedValue(
      new AeroAPIError("nf", "/x", 404, null),
    );
    const service = new CityBreakService();
    await expect(
      service.searchProposals({
        origin: "EPWA",
        dateFrom: "2026-08-10",
        dateTo: "2026-08-12",
        sortBy: "flightTime",
      } as SearchCityBreakQuery),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("CityBreakService.getProposalDetails", () => {
  const aeroClient = {
    getScheduledFlights: jest.fn(),
    getFlightsBetween: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAeroApiClient.mockReturnValue(aeroClient);
    mockedFindAirportInDb.mockResolvedValue(makeAirport());
    mockedGetRepository.mockImplementation(() => ({
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    }));
  });

  it("maps direct and connecting segments", async () => {
    aeroClient.getFlightsBetween.mockResolvedValue({
      flights: [
        {
          segments: [
            {
              ident: "LH456",
              flight_number: "456",
              operator: "Lufthansa",
              operator_icao: "DLH",
              operator_iata: "LH",
              scheduled_out: "2026-05-20T08:00:00Z",
              scheduled_in: "2026-05-20T10:00:00Z",
            },
          ],
        },
        {
          segments: [
            {
              ident: "AF1",
              flight_number: "1",
              operator: "Air France",
              operator_icao: "AFR",
              operator_iata: "AF",
              scheduled_out: "2026-05-20T09:00:00Z",
              scheduled_in: "2026-05-20T11:30:00Z",
            },
            {
              ident: "AF2",
              flight_number: "2",
              operator: "Air France",
              operator_icao: "AFR",
              operator_iata: "AF",
              scheduled_out: "2026-05-20T13:00:00Z",
              scheduled_in: "2026-05-20T14:00:00Z",
            },
          ],
        },
      ],
    });
    const service = new CityBreakService();
    const result = await service.getProposalDetails("eddf", {
      origin: "EPWA",
      dateFrom: "2026-05-20",
      dateTo: "2026-05-22",
    });
    expect(result.destinationIcao).toBe("EDDF");
    expect(result.options).toHaveLength(2);
    expect(result.options[0].isDirect).toBe(true);
    expect(result.options[0].stops).toBe(0);
    expect(result.options[0].durationMinutes).toBe(120);
    expect(result.options[1].isDirect).toBe(false);
    expect(result.options[1].stops).toBe(1);
  });
});
