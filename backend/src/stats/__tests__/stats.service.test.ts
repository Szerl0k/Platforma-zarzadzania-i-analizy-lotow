import { StatsService } from "../stats.service";
import type { UserHistoryRow } from "../stats.repository";

function makeRow(overrides: Partial<UserHistoryRow> = {}): UserHistoryRow {
  return {
    id: "h1",
    travelDate: "2025-04-01",
    ident: "LOT423",
    airlineIcao: "LOT",
    airlineName: "LOT Polish Airlines",
    originIcao: "EPWA",
    originIata: "WAW",
    originName: "Warsaw",
    originLat: 52.16,
    originLon: 21.0,
    destinationIcao: "EDDF",
    destinationIata: "FRA",
    destinationName: "Frankfurt",
    destinationLat: 50.03,
    destinationLon: 8.57,
    destinationCountryCode: "DE",
    durationMinutes: 120,
    distanceKm: 900,
    ...overrides,
  };
}

function makeRepoMock() {
  return {
    listUserHistoryRows: jest.fn(),
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
    repo.listUserHistoryRows.mockResolvedValue([]);
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
    const repo = makeRepoMock();
    repo.listUserHistoryRows.mockResolvedValue([
      makeRow({
        id: "h1",
        ident: "LOT423",
        airlineIcao: "LOT",
        airlineName: "LOT Polish Airlines",
        destinationIcao: "EDDF",
        destinationCountryCode: "DE",
        travelDate: "2025-04-01",
        durationMinutes: 120,
        distanceKm: 900,
      }),
      makeRow({
        id: "h2",
        ident: "RYR501",
        airlineIcao: "RYR",
        airlineName: "Ryanair",
        destinationIcao: "EGLL",
        destinationIata: "LHR",
        destinationName: "London Heathrow",
        destinationLat: 51.47,
        destinationLon: -0.45,
        destinationCountryCode: "GB",
        travelDate: "2025-06-15",
        durationMinutes: 180,
        distanceKm: 1450,
      }),
      makeRow({
        id: "h3",
        ident: "LOT777",
        airlineIcao: "LOT",
        airlineName: "LOT Polish Airlines",
        destinationIcao: "EDDF",
        destinationCountryCode: "DE",
        travelDate: "2024-08-10",
        durationMinutes: 120,
        distanceKm: 900,
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
    repo.listUserHistoryRows.mockResolvedValue(
      [2018, 2020, 2021, 2022, 2023, 2024, 2025].map((y) =>
        makeRow({
          id: `h-${y}`,
          travelDate: `${y}-01-01`,
          durationMinutes: null,
          distanceKm: null,
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
    const repo = makeRepoMock();
    repo.listUserHistoryRows.mockResolvedValue([
      makeRow({ id: "h1", travelDate: "2024-05-01" }),
      makeRow({ id: "h2", travelDate: "2025-05-01" }),
    ]);
    const service = new StatsService(repo as never);
    const routes = await service.getMyRoutes("user-1", 2025);
    expect(routes).toHaveLength(1);
    expect(routes[0]?.id).toBe("h2");
  });
});
