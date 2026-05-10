import { StatsService } from "../stats.service";
import {
  makeAirline,
  makeAirportWithLocation,
  makeCity,
  makeCountry,
  makeFlight,
  makeFlightHistory,
} from "../../tracking/__tests__/test-utils";

function makeRepoMock() {
  return {
    listUserHistoryWithJoins: jest.fn(),
    fetchDistanceRanking: jest.fn(),
    fetchFlightsRanking: jest.fn(),
    fetchCountriesRanking: jest.fn(),
    fetchUserDistance: jest.fn(),
    fetchUserFlightCount: jest.fn(),
    fetchUserCountriesCount: jest.fn(),
    fetchUserById: jest.fn(),
    countUsersAbove: jest.fn(),
  };
}

describe("StatsService.getMyStats", () => {
  it("returns all zeros for an empty history", async () => {
    const repo = makeRepoMock();
    repo.listUserHistoryWithJoins.mockResolvedValue([]);
    const service = new StatsService(repo as never);
    const stats = await service.getMyStats("user-1");
    expect(stats.totalFlights).toBe(0);
    expect(stats.totalDistanceKm).toBe(0);
    expect(stats.totalAirTimeMinutes).toBe(0);
    expect(stats.countriesVisited).toBe(0);
    expect(stats.airportsVisited).toBe(0);
    expect(stats.topAirline).toBeNull();
    expect(stats.longestFlight).toBeNull();
    expect(stats.averageDurationMinutes).toBe(0);
    expect(stats.perYear).toEqual([]);
    expect(stats.topAirlines).toEqual([]);
  });

  it("aggregates distance, duration, airline, longest flight", async () => {
    const lot = makeAirline({ icaoCode: "LOT", name: "LOT Polish Airlines" });
    const ryr = makeAirline({ icaoCode: "RYR", name: "Ryanair" });
    const waw = makeAirportWithLocation({
      icaoCode: "EPWA",
      iataCode: "WAW",
      name: "Warsaw",
      lat: 52.16,
      lon: 21.0,
      city: makeCity({
        id: 1,
        name: "Warsaw",
        countryCode: "PL",
        country: makeCountry({ isoCode: "PL", name: "Poland" }),
      }),
    });
    const fra = makeAirportWithLocation({
      icaoCode: "EDDF",
      iataCode: "FRA",
      name: "Frankfurt",
      lat: 50.03,
      lon: 8.57,
      city: makeCity({
        id: 2,
        name: "Frankfurt",
        countryCode: "DE",
        country: makeCountry({ isoCode: "DE", name: "Germany" }),
      }),
    });
    const lhr = makeAirportWithLocation({
      icaoCode: "EGLL",
      iataCode: "LHR",
      name: "London Heathrow",
      lat: 51.47,
      lon: -0.45,
      city: makeCity({
        id: 3,
        name: "London",
        countryCode: "GB",
        country: makeCountry({ isoCode: "GB", name: "United Kingdom" }),
      }),
    });

    const flight1 = makeFlight({
      id: "f1",
      identIcao: "LOT423",
      origin: waw,
      destination: fra,
      operatingAirline: lot,
      scheduledOut: new Date("2025-04-01T08:00:00Z"),
      scheduledIn: new Date("2025-04-01T10:00:00Z"),
    });
    const flight2 = makeFlight({
      id: "f2",
      identIcao: "RYR501",
      origin: waw,
      destination: lhr,
      operatingAirline: ryr,
      scheduledOut: new Date("2025-06-15T08:00:00Z"),
      scheduledIn: new Date("2025-06-15T11:00:00Z"),
    });
    const flight3 = makeFlight({
      id: "f3",
      identIcao: "LOT777",
      origin: waw,
      destination: fra,
      operatingAirline: lot,
      scheduledOut: new Date("2024-08-10T08:00:00Z"),
      scheduledIn: new Date("2024-08-10T10:00:00Z"),
    });

    const repo = makeRepoMock();
    repo.listUserHistoryWithJoins.mockResolvedValue([
      makeFlightHistory({
        id: "h1",
        flightId: "f1",
        flight: flight1,
        travelDate: "2025-04-01",
      }),
      makeFlightHistory({
        id: "h2",
        flightId: "f2",
        flight: flight2,
        travelDate: "2025-06-15",
      }),
      makeFlightHistory({
        id: "h3",
        flightId: "f3",
        flight: flight3,
        travelDate: "2024-08-10",
      }),
    ]);

    const service = new StatsService(repo as never);
    const stats = await service.getMyStats("user-1");

    expect(stats.totalFlights).toBe(3);
    expect(stats.totalDistanceKm).toBeGreaterThan(0);
    expect(stats.totalAirTimeMinutes).toBe(120 + 180 + 120);
    expect(stats.averageDurationMinutes).toBe(140);
    expect(stats.countriesVisited).toBe(2); // DE, GB
    expect(stats.airportsVisited).toBe(3); // EPWA, EDDF, EGLL
    expect(stats.topAirline?.icao).toBe("LOT");
    expect(stats.topAirline?.count).toBe(2);
    expect(stats.longestFlight?.originIcao).toBe("EPWA");
    expect(stats.longestFlight?.destinationIcao).toBe("EGLL");
    expect(stats.perYear.map((y) => y.year)).toEqual([2024, 2025]);
    expect(stats.topAirlines).toHaveLength(2);
  });

  it("limits perYear to last 5 years", async () => {
    const repo = makeRepoMock();
    repo.listUserHistoryWithJoins.mockResolvedValue(
      [2018, 2020, 2021, 2022, 2023, 2024, 2025].map((y) =>
        makeFlightHistory({
          id: `h-${y}`,
          travelDate: `${y}-01-01`,
          flight: makeFlight({ id: `f-${y}`, scheduledOut: null, scheduledIn: null }),
        }),
      ),
    );
    const service = new StatsService(repo as never);
    const stats = await service.getMyStats("user-1");
    expect(stats.perYear.map((y) => y.year)).toEqual([
      2021, 2022, 2023, 2024, 2025,
    ]);
  });
});

describe("StatsService.getMyRoutes", () => {
  it("filters by year", async () => {
    const f2024 = makeFlight({ id: "f-24" });
    const f2025 = makeFlight({ id: "f-25" });
    const repo = makeRepoMock();
    repo.listUserHistoryWithJoins.mockResolvedValue([
      makeFlightHistory({
        id: "h1",
        travelDate: "2024-05-01",
        flight: f2024,
      }),
      makeFlightHistory({
        id: "h2",
        travelDate: "2025-05-01",
        flight: f2025,
      }),
    ]);
    const service = new StatsService(repo as never);
    const routes = await service.getMyRoutes("user-1", 2025);
    expect(routes).toHaveLength(1);
    expect(routes[0]?.id).toBe("h2");
  });
});
