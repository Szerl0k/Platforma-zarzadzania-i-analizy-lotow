import { FlightsService } from "../flights.service";
import { FlightsRepository } from "../flights.repository";
import {
  getAeroApiClient,
  AeroAPIClient,
} from "../../common/integrations/aeroapi";
import { findAirlineInDb } from "../../geo/geo.service";
import { DataSource } from "typeorm";
import { AppDataSource } from "../../common/database/data-source";
import { FlightNotFoundError } from "../../common/errors";
import { FlightUtils } from "../flights.utils";

jest.mock("../../common/integrations/aeroapi");
jest.mock("../../geo/geo.service");
jest.mock("../flights.repository");
jest.mock("../../common/database/data-source", () => ({
  AppDataSource: {
    transaction: jest.fn(),
    getRepository: jest.fn(),
  },
}));

const mockAeroClient = {
  getScheduledFlights: jest.fn(),
  getFlightInfo: jest.fn(),
} as unknown as jest.Mocked<AeroAPIClient>;

(getAeroApiClient as jest.Mock).mockReturnValue(mockAeroClient);

describe("FlightsService", () => {
  let service: FlightsService;
  let mockFlightsRepo: jest.Mocked<FlightsRepository>;
  let mockDataSource: jest.Mocked<DataSource>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDataSource = {
      transaction: jest.fn(async (cb) => {
        return cb(mockDataSource); // Execute the transaction callback directly
      }),
      getRepository: jest.fn(() => ({
        createQueryBuilder: jest.fn(() => ({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        })),
      })),
    } as unknown as jest.Mocked<DataSource>;
    mockFlightsRepo = new FlightsRepository(
      mockDataSource,
    ) as jest.Mocked<FlightsRepository>;
    // FlightsService now resolves geo data via the GeoLookupPort; inject one
    // backed by the existing geo.service mock so expectations stay the same.
    const testGeo = {
      findAirport: jest.fn(),
      findAirline: findAirlineInDb as jest.Mock,
    };
    service = new FlightsService(mockDataSource, mockFlightsRepo, testGeo);
  });

  describe("createFlight", () => {
    it("should create a flight and return DTO", async () => {
      const dtoData = { identIcao: "LOT123", statusId: 1 };
      const flightEntity = { id: "123", status: { name: "Scheduled" } };

      mockFlightsRepo.create.mockResolvedValue(flightEntity as never);
      mockFlightsRepo.findById.mockResolvedValue(flightEntity as never);
      jest
        .spyOn(FlightUtils, "mapToDTO")
        .mockReturnValue({ id: "123" } as unknown as never);

      const result = await service.createFlight(dtoData as never);

      expect(mockFlightsRepo.create).toHaveBeenCalledWith(dtoData);
      expect(mockFlightsRepo.findById).toHaveBeenCalledWith(
        "123",
        expect.any(Array),
      );
      expect(result).toEqual({ id: "123" });
    });
  });

  describe("updateFlight", () => {
    it("should update a flight and return DTO", async () => {
      const dtoData = { identIcao: "LOT123" };
      const flightEntity = { id: "123" };

      mockFlightsRepo.update.mockResolvedValue(flightEntity as never);
      mockFlightsRepo.findById.mockResolvedValue(flightEntity as never);
      jest
        .spyOn(FlightUtils, "mapToDTO")
        .mockReturnValue({ id: "123" } as unknown as never);

      const result = await service.updateFlight("123", dtoData as never);

      expect(mockFlightsRepo.update).toHaveBeenCalledWith("123", dtoData);
      expect(result).toEqual({ id: "123" });
    });

    it("should throw FlightNotFoundError if flight doesn't exist", async () => {
      mockFlightsRepo.update.mockResolvedValue(null);
      await expect(service.updateFlight("123", {})).rejects.toThrow(
        FlightNotFoundError,
      );
    });
  });

  describe("getFlightById", () => {
    it("should return flight DTO", async () => {
      const flightEntity = { id: "123" };
      mockFlightsRepo.findById.mockResolvedValue(flightEntity as never);
      jest
        .spyOn(FlightUtils, "mapToDTO")
        .mockReturnValue({ id: "123" } as unknown as never);

      const result = await service.getFlightById("123");
      expect(result).toEqual({ id: "123" });
    });

    it("should throw FlightNotFoundError if not found", async () => {
      mockFlightsRepo.findById.mockResolvedValue(null);
      await expect(service.getFlightById("123")).rejects.toThrow(
        FlightNotFoundError,
      );
    });
  });

  describe("deleteFlight", () => {
    it("should delete flight", async () => {
      mockFlightsRepo.delete.mockResolvedValue(true);
      await service.deleteFlight("123");
      expect(mockFlightsRepo.delete).toHaveBeenCalledWith("123");
    });

    it("should throw FlightNotFoundError if not found", async () => {
      mockFlightsRepo.delete.mockResolvedValue(false);
      await expect(service.deleteFlight("123")).rejects.toThrow(
        FlightNotFoundError,
      );
    });
  });

  describe("getFlightPath", () => {
    it("should return flight path", async () => {
      const path = { traveled: {}, remaining: {} };
      mockFlightsRepo.getFlightPath.mockResolvedValue(path);
      const result = await service.getFlightPath("123");
      expect(result).toEqual(path);
    });

    it("should throw FlightNotFoundError if both traveled and remaining are missing", async () => {
      mockFlightsRepo.getFlightPath.mockResolvedValue({
        traveled: null,
        remaining: null,
      });
      await expect(service.getFlightPath("123")).rejects.toThrow(
        FlightNotFoundError,
      );
    });
  });

  describe("searchFlight", () => {
    it("should normalize ident and call getFlightDetailsAndSave", async () => {
      (findAirlineInDb as jest.Mock).mockResolvedValue(null);
      jest
        .spyOn(service, "getFlightDetailsAndSave")
        .mockResolvedValue({ id: "123" } as never);

      const result = await service.searchFlight("LOT123");
      expect(service.getFlightDetailsAndSave).toHaveBeenCalledWith("LOT123");
      expect(result).toEqual({ id: "123" });
    });

    it("should normalize IATA to ICAO if airline found", async () => {
      (findAirlineInDb as jest.Mock).mockResolvedValue({ icaoCode: "LOT" });
      jest
        .spyOn(service, "getFlightDetailsAndSave")
        .mockResolvedValue({ id: "123" } as never);

      const result = await service.searchFlight("LO123");
      expect(service.getFlightDetailsAndSave).toHaveBeenCalledWith("LOT123");
    });

    it("should fallback to raw ident if airline not found or icaoCode is null", async () => {
      (findAirlineInDb as jest.Mock).mockResolvedValue({ icaoCode: null });
      jest
        .spyOn(service, "getFlightDetailsAndSave")
        .mockResolvedValue({ id: "123" } as never);
      await service.searchFlight("LO123");
      expect(service.getFlightDetailsAndSave).toHaveBeenCalledWith("LO123");
    });
  });

  describe("findFlightsLocally", () => {
    it("should return mapped DTOs from repository", async () => {
      (findAirlineInDb as jest.Mock).mockResolvedValue(null);
      const mockFlight = { id: "123" };
      mockFlightsRepo.findFlightsByIdentAndDateRange = jest
        .fn()
        .mockResolvedValue([mockFlight]);

      jest
        .spyOn(FlightUtils, "mapToDTO")
        .mockReturnValue({ id: "123" } as unknown as never);

      const result = await service.findFlightsLocally(
        "LOT123",
        "2023-01-01",
        "2023-01-02",
      );
      expect(result).toEqual([{ id: "123" }]);
      expect(
        mockFlightsRepo.findFlightsByIdentAndDateRange,
      ).toHaveBeenCalledWith("LOT123", "2023-01-01", "2023-01-02");
    });
  });

  describe("syncFlightsFromAeroApi", () => {
    it("should use scheduled flights if not exactly today", async () => {
      (findAirlineInDb as jest.Mock).mockResolvedValue(null);
      mockAeroClient.getScheduledFlights.mockResolvedValue({
        scheduled: [{ ident_icao: "LOT123", scheduled_out: "2026-06-03" }],
      } as never);

      mockFlightsRepo.findOrCreateStatus.mockResolvedValue({ id: 1 } as never);
      mockFlightsRepo.findByFaFlightId.mockResolvedValue(null);
      mockFlightsRepo.create.mockResolvedValue({ id: "123" } as never);
      mockFlightsRepo.findById.mockResolvedValue({ id: "123" } as never);
      jest
        .spyOn(FlightUtils, "mapToDTO")
        .mockReturnValue({ id: "123" } as unknown as never);

      const result = await service.syncFlightsFromAeroApi(
        "LOT123",
        "2026-06-03",
        "2026-06-05",
      );
      expect(result).toEqual([{ id: "123" }]);
      expect(mockAeroClient.getScheduledFlights).toHaveBeenCalled();
    });

    it("should test persistAeroSchedule with fa_flight_id and existing record, and dto=null", async () => {
      (findAirlineInDb as jest.Mock).mockResolvedValue(null);
      mockAeroClient.getScheduledFlights.mockResolvedValue({
        scheduled: [
          {
            ident: "LOT123",
            scheduled_out: "2026-06-03",
            fa_flight_id: "fa-123",
          },
        ],
      } as never);

      mockFlightsRepo.findOrCreateStatus.mockResolvedValue({ id: 1 } as never);
      mockFlightsRepo.findByFaFlightId.mockResolvedValue({
        id: "123",
      } as never);
      mockFlightsRepo.update.mockResolvedValue({ id: "123" } as never);
      mockFlightsRepo.findById.mockResolvedValue({ id: "123" } as never);
      jest.spyOn(FlightUtils, "mapToDTO").mockReturnValue(null);

      const result = await service.syncFlightsFromAeroApi(
        "LOT123",
        "2026-06-03",
        "2026-06-05",
      );
      expect(result).toEqual([]);
      expect(mockFlightsRepo.update).toHaveBeenCalled();
    });

    it("should return empty if no scheduled flights", async () => {
      (findAirlineInDb as jest.Mock).mockResolvedValue(null);
      mockAeroClient.getScheduledFlights.mockResolvedValue({ scheduled: [] });
      const result = await service.syncFlightsFromAeroApi(
        "LOT123",
        "2026-06-03",
        "2026-06-05",
      );
      expect(result).toEqual([]);
    });

    it("should use getFlightInfo if exactly today", async () => {
      (findAirlineInDb as jest.Mock).mockResolvedValue(null);
      const today = new Date().toISOString().split("T")[0];
      mockAeroClient.getFlightInfo.mockResolvedValue({
        flights: [{ ident_icao: "LOT123" }],
      } as never);

      mockFlightsRepo.findOrCreateStatus.mockResolvedValue({ id: 1 } as never);
      mockFlightsRepo.findByFaFlightId.mockResolvedValue({
        id: "123",
      } as never);
      mockFlightsRepo.update.mockResolvedValue({ id: "123" } as never);
      mockFlightsRepo.findById.mockResolvedValue({ id: "123" } as never);
      jest
        .spyOn(FlightUtils, "mapToDTO")
        .mockReturnValue({ id: "123" } as unknown as never);

      const result = await service.syncFlightsFromAeroApi(
        "LOT123",
        today,
        today,
      );
      expect(result).toEqual([{ id: "123" }]);
      expect(mockAeroClient.getFlightInfo).toHaveBeenCalled();
    });

    it("should return empty if no flights in getFlightInfo", async () => {
      (findAirlineInDb as jest.Mock).mockResolvedValue(null);
      const today = new Date().toISOString().split("T")[0];
      mockAeroClient.getFlightInfo.mockResolvedValue({ flights: [] } as never);
      const result = await service.syncFlightsFromAeroApi(
        "LOT123",
        today,
        today,
      );
      expect(result).toEqual([]);
    });

    it("should test persistAeroFlight missing optional fields and dto=null", async () => {
      (findAirlineInDb as jest.Mock).mockResolvedValue(null);
      const today = new Date().toISOString().split("T")[0];
      mockAeroClient.getFlightInfo.mockResolvedValue({
        flights: [
          { ident: "LOT123", fa_flight_id: "fa-123", codeshares_iata: ["LO"] },
        ],
      } as never);

      mockFlightsRepo.findOrCreateStatus.mockResolvedValue({ id: 1 } as never);
      mockFlightsRepo.findByFaFlightId.mockResolvedValue(null);
      mockFlightsRepo.create.mockResolvedValue({ id: "123" } as never);
      mockFlightsRepo.findById.mockResolvedValue({ id: "123" } as never);
      mockFlightsRepo.syncCodeshares.mockResolvedValue();
      jest.spyOn(FlightUtils, "mapToDTO").mockReturnValue(null);

      const result = await service.syncFlightsFromAeroApi(
        "LOT123",
        today,
        today,
      );
      expect(result).toEqual([]);
      expect(mockFlightsRepo.create).toHaveBeenCalled();
      expect(mockFlightsRepo.syncCodeshares).toHaveBeenCalledWith(
        "123",
        ["LO"],
        expect.anything(),
      );
    });
  });

  describe("getFlightDetailsAndSave", () => {
    it("should return from cache if recent", async () => {
      const flight = { updatedAt: new Date() };
      mockFlightsRepo.findByCallsign.mockResolvedValue(flight as never);
      jest
        .spyOn(FlightUtils, "mapToDTO")
        .mockReturnValue({ id: "123" } as unknown as never);

      const result = await service.getFlightDetailsAndSave("LOT123");
      expect(result).toEqual({ id: "123" });
      expect(mockAeroClient.getFlightInfo).not.toHaveBeenCalled();
    });

    it("should fetch from AeroAPI if not in cache or expired", async () => {
      mockFlightsRepo.findByCallsign.mockResolvedValue(null);
      mockAeroClient.getFlightInfo.mockResolvedValue({
        flights: [{ ident_icao: "LOT123", fa_flight_id: "fa1" }],
      } as never);

      mockFlightsRepo.findOrCreateStatus.mockResolvedValue({ id: 1 } as never);
      mockFlightsRepo.findByFaFlightId.mockResolvedValue(null);
      mockFlightsRepo.create.mockResolvedValue({ id: "123" } as never);
      mockFlightsRepo.findById.mockResolvedValue({ id: "123" } as never);
      jest
        .spyOn(FlightUtils, "mapToDTO")
        .mockReturnValue({ id: "123" } as unknown as never);

      const result = await service.getFlightDetailsAndSave("LOT123");
      expect(result).toEqual({ id: "123" });
      expect(mockAeroClient.getFlightInfo).toHaveBeenCalled();
    });

    it("should throw FlightNotFoundError if no active flight details in AeroAPI", async () => {
      mockFlightsRepo.findByCallsign.mockResolvedValue(null);
      mockAeroClient.getFlightInfo.mockResolvedValue({ flights: [] } as never);
      await expect(service.getFlightDetailsAndSave("LOT123")).rejects.toThrow(
        FlightNotFoundError,
      );
    });
  });

  describe("ingestByFaFlightId", () => {
    it("should return flight entity if found", async () => {
      mockAeroClient.getFlightInfo.mockResolvedValue({
        flights: [{ ident_icao: "LOT123", codeshares_iata: ["LO"] }],
      } as never);

      mockFlightsRepo.findOrCreateStatus.mockResolvedValue({ id: 1 } as never);
      mockFlightsRepo.findByFaFlightId.mockResolvedValue(null);
      mockFlightsRepo.create.mockResolvedValue({ id: "123" } as never);
      mockFlightsRepo.findById.mockResolvedValue({ id: "123" } as never);

      const result = await service.ingestByFaFlightId("fa1");
      expect(result).toEqual({ id: "123" });
    });

    it("should return null if no flights", async () => {
      mockAeroClient.getFlightInfo.mockResolvedValue({ flights: [] } as never);
      const result = await service.ingestByFaFlightId("fa1");
      expect(result).toBeNull();
    });

    it("should return null if AeroAPI throws error", async () => {
      mockAeroClient.getFlightInfo.mockRejectedValue(new Error("API Error"));
      const result = await service.ingestByFaFlightId("fa1");
      expect(result).toBeNull();
    });
  });
});
