import { FlightUtils } from "../flights.utils";
import { Flight } from "../../flights/entities/Flight";

describe("FlightUtils", () => {
  describe("parseIdent", () => {
    it("should parse a valid ICAO identifier with just numbers", () => {
      const result = FlightUtils.parseIdent("LOT379");
      expect(result).toEqual({ airline: "LOT", flightNumber: "379" });
    });

    it("should parse a valid ICAO identifier with numbers and a trailing letter", () => {
      const result = FlightUtils.parseIdent("RYR123A");
      expect(result).toEqual({ airline: "RYR", flightNumber: "123A" });
    });

    it("should return null for an identifier with too few airline letters", () => {
      const result = FlightUtils.parseIdent("LO379");
      expect(result).toBeNull();
    });

    it("should return null for an identifier with no numbers", () => {
      const result = FlightUtils.parseIdent("LOT");
      expect(result).toBeNull();
    });

    it("should return null for an identifier with too many numbers", () => {
      const result = FlightUtils.parseIdent("LOT12345");
      expect(result).toBeNull();
    });

    it("should return null for an empty string", () => {
      const result = FlightUtils.parseIdent("");
      expect(result).toBeNull();
    });
  });

  describe("formatAeroDate", () => {
    it("should format a Date object by removing milliseconds", () => {
      const date = new Date("2026-04-15T23:00:00.123Z");
      const result = FlightUtils.formatAeroDate(date);
      expect(result).toBe("2026-04-15T23:00:00Z");
    });

    it("should format a Date object that has zero milliseconds correctly", () => {
      const date = new Date("2026-04-15T23:00:00.000Z");
      const result = FlightUtils.formatAeroDate(date);
      expect(result).toBe("2026-04-15T23:00:00Z");
    });
  });

  describe("mapToDTO", () => {
    it("should return null if flight is null", () => {
      const result = FlightUtils.mapToDTO(null, "database");
      expect(result).toBeNull();
    });

    it("should map a complete flight correctly", () => {
      const mockDate = new Date("2026-06-03T10:00:00Z");
      const completeFlight = {
        id: "flight-1",
        identIcao: "LOT123",
        identIata: "LO123",
        operatingAirlineIcao: "LOT",
        callsign: "POLE123",
        faFlightId: "fa-123",
        originIcao: "EPWA",
        destinationIcao: "EGLL",
        statusId: 2,
        terminalOrigin: "1",
        gateOrigin: "A1",
        terminalDestination: "5",
        gateDestination: "B2",
        departureDelay: 10,
        arrivalDelay: 0,
        scheduledOut: mockDate,
        estimatedOut: mockDate,
        actualOut: mockDate,
        scheduledIn: mockDate,
        estimatedIn: mockDate,
        actualIn: mockDate,
        status: {
          id: 2,
          name: "En Route",
          category: "Active",
        },
        origin: {
          icaoCode: "EPWA",
          iataCode: "WAW",
          name: "Chopin Airport",
          city: {
            name: "Warsaw",
            country: {
              name: "Poland",
            },
          },
        },
        destination: {
          icaoCode: "EGLL",
          iataCode: "LHR",
          name: "Heathrow",
          city: {
            name: "London",
            country: {
              name: "UK",
            },
          },
        },
        operatingAirline: {
          icaoCode: "LOT",
          name: "LOT Polish Airlines",
        },
      } as never;

      const result = FlightUtils.mapToDTO(completeFlight, "AeroAPI");

      expect(result).toEqual({
        id: "flight-1",
        identIcao: "LOT123",
        identIata: "LO123",
        operatingAirlineIcao: "LOT",
        callsign: "POLE123",
        faFlightId: "fa-123",
        originIcao: "EPWA",
        destinationIcao: "EGLL",
        statusId: 2,
        terminalOrigin: "1",
        gateOrigin: "A1",
        terminalDestination: "5",
        gateDestination: "B2",
        departureDelay: 10,
        arrivalDelay: 0,
        scheduledOut: mockDate.toISOString(),
        estimatedOut: mockDate.toISOString(),
        actualOut: mockDate.toISOString(),
        scheduledIn: mockDate.toISOString(),
        estimatedIn: mockDate.toISOString(),
        actualIn: mockDate.toISOString(),
        status: {
          id: 2,
          name: "En Route",
          category: "Active",
        },
        origin: {
          icaoCode: "EPWA",
          iataCode: "WAW",
          name: "Chopin Airport",
          city: {
            name: "Warsaw",
            countryName: "Poland",
          },
        },
        destination: {
          icaoCode: "EGLL",
          iataCode: "LHR",
          name: "Heathrow",
          city: {
            name: "London",
            countryName: "UK",
          },
        },
        operatingAirline: {
          icaoCode: "LOT",
          name: "LOT Polish Airlines",
        },
        isLive: true,
        source: "AeroAPI",
      });
    });

    it("should map a flight with minimal fields correctly", () => {
      const minimalFlight = {
        id: "flight-2",
        status: {
          name: "Scheduled",
        },
      } as never;

      const result = FlightUtils.mapToDTO(minimalFlight, "database");

      expect(result).toEqual({
        id: "flight-2",
        identIcao: undefined,
        identIata: undefined,
        operatingAirlineIcao: undefined,
        callsign: undefined,
        faFlightId: undefined,
        originIcao: undefined,
        destinationIcao: undefined,
        statusId: undefined,
        terminalOrigin: undefined,
        gateOrigin: undefined,
        terminalDestination: undefined,
        gateDestination: undefined,
        departureDelay: undefined,
        arrivalDelay: undefined,
        scheduledOut: null,
        estimatedOut: null,
        actualOut: null,
        scheduledIn: null,
        estimatedIn: null,
        actualIn: null,
        status: {
          id: undefined,
          name: "Scheduled",
          category: undefined,
        },
        origin: null,
        destination: null,
        operatingAirline: null,
        isLive: false,
        source: "database",
      });
    });

    it("should handle missing country in city object gracefully", () => {
      const flightWithMissingCountry = {
        id: "flight-3",
        status: {
          name: "Arrived",
        },
        origin: {
          city: {
            name: "Warsaw",
            country: null,
          },
        },
        destination: {
          city: {
            name: "London",
            country: null,
          },
        },
      } as never;

      const result = FlightUtils.mapToDTO(flightWithMissingCountry, "database");

      expect(result?.origin?.city?.countryName).toBeNull();
      expect(result?.destination?.city?.countryName).toBeNull();
    });

    it("should handle missing city in origin and destination gracefully", () => {
      const flightWithMissingCity = {
        id: "flight-4",
        status: {
          name: "Cancelled",
        },
        origin: {
          city: null,
        },
        destination: {
          city: null,
        },
      } as never;

      const result = FlightUtils.mapToDTO(flightWithMissingCity, "database");

      expect(result?.origin?.city).toBeUndefined();
      expect(result?.destination?.city).toBeUndefined();
    });
  });
});
