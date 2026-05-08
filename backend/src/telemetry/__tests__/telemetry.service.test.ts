import { TelemetryService } from "../telemetry.service";
import {
  getAeroApiClient,
  AeroAPIClient,
} from "../../common/integrations/aeroapi";
import {
  getOpenSkyClient,
  OpenSkyClient,
  StateVectorTuple,
  OpenSkyStateVectorsResponse,
} from "../../common/integrations/opensky";
import { TelemetryRepository } from "../telemetry.repository";
import { FlightsRepository } from "../../flights/flights.repository";
import { FlightsService } from "../../flights/flights.service";
import { TelemetryNotFoundError } from "../../common/errors";
import { BoundingBoxLimitError } from "../telemetry.errors";
import { DataSource } from "typeorm";
import { Flight } from "../../flights/entities/Flight";
import { FlightTelemetry } from "../entities/FlightTelemetry";
import { FlightDetailsResponseDTO } from "../../flights/flights.dto";
import {
  AeroAPIFlightDetails,
  AeroAPIStandardFlightsResponse,
  AeroAPIFlightPositionResponse,
  AeroAPILastPosition,
} from "../../common/integrations/aeroapi/types";
import {
  createMockAeroFlightPosition,
  createMockAeroFlightsResponse,
  createMockAeroPosition,
  createMockStateVector,
} from "./test-utils";

jest.mock("../../common/integrations/aeroapi");
jest.mock("../../common/integrations/opensky");
jest.mock("../telemetry.repository");
jest.mock("../../flights/flights.repository");
jest.mock("../../flights/flights.service");
jest.mock("../../common/database/data-source");

describe("TelemetryService", () => {
  let service: TelemetryService;
  let mockAeroClient: jest.Mocked<AeroAPIClient>;
  let mockOpenSkyClient: jest.Mocked<OpenSkyClient>;
  let mockTelemetryRepo: jest.Mocked<TelemetryRepository>;
  let mockFlightsRepo: jest.Mocked<FlightsRepository>;
  let mockFlightsService: jest.Mocked<FlightsService>;

  beforeEach(() => {
    mockAeroClient = {
      getFlightPosition: jest.fn(),
      getFlightInfo: jest.fn(),
    } as unknown as jest.Mocked<AeroAPIClient>;

    mockOpenSkyClient = {
      getAllStateVectors: jest.fn(),
    } as unknown as jest.Mocked<OpenSkyClient>;

    (getAeroApiClient as jest.Mock).mockReturnValue(mockAeroClient);
    (getOpenSkyClient as jest.Mock).mockReturnValue(mockOpenSkyClient);

    service = new TelemetryService({} as unknown as DataSource);

    const serviceInternal = service as unknown as Record<string, unknown>;
    mockTelemetryRepo =
      serviceInternal.telemetryRepository as jest.Mocked<TelemetryRepository>;
    mockFlightsRepo =
      serviceInternal.flightsRepository as jest.Mocked<FlightsRepository>;
    mockFlightsService =
      serviceInternal.flightsService as jest.Mocked<FlightsService>;
  });

  describe("getFlightsInArea", () => {
    const query = { lamin: 50, lamax: 51, lomin: 20, lomax: 21 };

    it("should return mapped flight states when data is available", async () => {
      const mockStates: OpenSkyStateVectorsResponse = {
        time: 12345678,
        states: [
          createMockStateVector({
            icao24: "icao1",
            callsign: "CALL1   ",
            lat: 50.5,
            lon: 20.5,
          }),
        ],
      };
      mockOpenSkyClient.getAllStateVectors.mockResolvedValue(mockStates);

      const result = await service.getFlightsInArea(query);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        icao24: "icao1",
        callsign: "CALL1",
        location: {
          type: "Point",
          coordinates: [20.5, 50.5],
        },
        altitude: 10000,
        velocity: 200,
        heading: 90,
        onGround: false,
      });
    });

    it("should filter out states with missing coordinates", async () => {
      const mockStates: OpenSkyStateVectorsResponse = {
        time: 12345678,
        states: [
          createMockStateVector({ icao24: "icao1", lon: null, lat: 50.5 }),
          createMockStateVector({ icao24: "icao2", lon: 20.5, lat: null }),
          createMockStateVector({ icao24: "icao3", lon: 20.5, lat: 50.5 }),
        ],
      };
      mockOpenSkyClient.getAllStateVectors.mockResolvedValue(mockStates);

      const result = await service.getFlightsInArea(query);

      expect(result).toHaveLength(1);
      expect(result[0].icao24).toBe("icao3");
    });

    it("should return empty array if no states found", async () => {
      mockOpenSkyClient.getAllStateVectors.mockResolvedValue({
        time: 0,
        states: null,
      });

      const result = await service.getFlightsInArea(query);

      expect(result).toEqual([]);
    });

    it("should throw BoundingBoxLimitError if area exceeds limit", async () => {
      const largeQuery = { lamin: 0, lamax: 30, lomin: 0, lomax: 20 };
      await expect(service.getFlightsInArea(largeQuery)).rejects.toThrow(
        BoundingBoxLimitError,
      );
    });
  });

  describe("locateAndSaveFlight", () => {
    it("should resolve by ICAO24 direct lookup when possible", async () => {
      const query = { icao24: "icao1" };
      const mockState = createMockStateVector({
        icao24: "icao1",
        callsign: "CALL1",
        lon: 20,
        lat: 50,
      });
      mockOpenSkyClient.getAllStateVectors.mockResolvedValue({
        time: 123456,
        states: [mockState],
      });
      mockFlightsService.getFlightDetailsAndSave.mockResolvedValue({
        faFlightId: "fa1",
      } as unknown as FlightDetailsResponseDTO);
      mockFlightsRepo.findByFaFlightId.mockResolvedValue({
        id: "flight-uuid",
      } as unknown as Flight);
      mockTelemetryRepo.save.mockResolvedValue({
        id: "telemetry-id",
        icao24: "icao1",
        flightId: "flight-uuid",
        timestamp: new Date("2026-05-05"),
        location: { type: "Point", coordinates: [20, 50] },
      } as unknown as FlightTelemetry);
      mockTelemetryRepo.calculateDistances.mockResolvedValue({
        distanceFromOriginKm: 100,
        distanceToDestinationKm: 200,
      });

      const result = await service.locateAndSaveFlight(query);

      expect(result.faFlightId).toBe("fa1");
      expect(result.distanceFromOriginKm).toBe(100);
      expect(mockOpenSkyClient.getAllStateVectors).toHaveBeenCalledWith(
        undefined,
        "icao1",
      );
    });

    it("should fallback to Strategy 2 (spatial match) if faFlightId is provided and icao24 lookup fails", async () => {
      const query = { faFlightId: "fa1" };

      // AeroAPI Position
      mockAeroClient.getFlightPosition.mockResolvedValue(
        createMockAeroFlightPosition({
          ident_icao: "CALL2",
          last_position: createMockAeroPosition({
            latitude: 52.0,
            longitude: 21.0,
          }),
        }),
      );
      // AeroAPI Info for atc_ident
      mockAeroClient.getFlightInfo.mockResolvedValue(
        createMockAeroFlightsResponse([{ atc_ident: "CALL2" }]),
      );

      // OpenSky returns a match near that position
      const mockMatch = createMockStateVector({
        icao24: "icao2",
        callsign: "CALL2",
        lon: 21.1,
        lat: 52.1,
        alt: 5000,
        velocity: 150,
        heading: 45,
      });
      mockOpenSkyClient.getAllStateVectors.mockResolvedValue({
        time: 123456,
        states: [mockMatch],
      });

      // Repositories
      mockFlightsRepo.findByFaFlightId.mockResolvedValue({
        id: "f-uuid",
      } as Flight);
      mockTelemetryRepo.save.mockResolvedValue({
        id: "t-id",
        icao24: "icao2",
        flightId: "f-uuid",
        timestamp: new Date(),
        location: { type: "Point", coordinates: [21.1, 52.1] },
      } as FlightTelemetry);
      mockTelemetryRepo.calculateDistances.mockResolvedValue({
        distanceFromOriginKm: 50,
        distanceToDestinationKm: 50,
      });

      const result = await service.locateAndSaveFlight(query);

      expect(result.icao24).toBe("icao2");
      expect(mockAeroClient.getFlightPosition).toHaveBeenCalledWith("fa1");
      // Check if bounding box was created around 52, 21
      expect(mockOpenSkyClient.getAllStateVectors).toHaveBeenCalledWith(
        expect.objectContaining({ lamin: 50.5, lamax: 53.5 }),
      );
    });

    it("should throw BoundingBoxLimitError if state vector coordinates are null during persistence", async () => {
      const query = { icao24: "icao1" };
      const mockState = createMockStateVector({
        icao24: "icao1",
        callsign: "CALL1",
        lon: null,
        lat: null,
      });
      mockOpenSkyClient.getAllStateVectors.mockResolvedValue({
        time: 123456,
        states: [mockState],
      });
      mockFlightsService.getFlightDetailsAndSave.mockResolvedValue({
        faFlightId: "fa1",
      } as unknown as FlightDetailsResponseDTO);
      mockFlightsRepo.findByFaFlightId.mockResolvedValue({
        id: "f-uuid",
      } as Flight);

      await expect(service.locateAndSaveFlight(query)).rejects.toThrow(
        BoundingBoxLimitError,
      );
    });

    it("should throw TelemetryNotFoundError if AeroAPI returns no spatial data for faFlightId", async () => {
      const query = { faFlightId: "fa-no-pos" };
      mockAeroClient.getFlightPosition.mockResolvedValue(
        createMockAeroFlightPosition({ last_position: null }),
      );

      await expect(service.locateAndSaveFlight(query)).rejects.toThrow(
        "No active spatial data (last_position) for fa-no-pos.",
      );
    });

    it("should throw TelemetryNotFoundError if no callsign matches in spatial search", async () => {
      const query = { faFlightId: "fa1" };
      mockAeroClient.getFlightPosition.mockResolvedValue(
        createMockAeroFlightPosition({
          ident_icao: "CALL-X",
          last_position: createMockAeroPosition({
            latitude: 52,
            longitude: 21,
          }),
        }),
      );
      mockAeroClient.getFlightInfo.mockResolvedValue(
        createMockAeroFlightsResponse([{ atc_ident: null }]),
      );
      mockOpenSkyClient.getAllStateVectors.mockResolvedValue({
        time: 123456,
        states: [
          createMockStateVector({
            icao24: "icao-other",
            callsign: "OTHER",
            lon: 21,
            lat: 52,
          }),
        ],
      });

      await expect(service.locateAndSaveFlight(query)).rejects.toThrow(
        "Could not match callsign CALL-X to any OpenSky state vector near its last known position.",
      );
    });

    it("should throw TelemetryNotFoundError if no state vector found", async () => {
      const query = { icao24: "icao1" };
      mockOpenSkyClient.getAllStateVectors.mockResolvedValue({
        time: 0,
        states: [],
      });

      await expect(service.locateAndSaveFlight(query)).rejects.toThrow(
        TelemetryNotFoundError,
      );
    });

    it("should throw TelemetryNotFoundError if callsign missing for ICAO lookup", async () => {
      const query = { icao24: "icao1" };
      const mockState = createMockStateVector({
        icao24: "icao1",
        callsign: null,
        lon: 20,
        lat: 50,
      });
      mockOpenSkyClient.getAllStateVectors.mockResolvedValue({
        time: 0,
        states: [mockState],
      });

      await expect(service.locateAndSaveFlight(query)).rejects.toThrow(
        "Could not resolve callsign for aircraft icao1 from OpenSky.",
      );
    });
  });
});
