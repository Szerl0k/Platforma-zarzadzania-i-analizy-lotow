import { TelemetryRepository } from "../telemetry.repository";
import { DataSource, Repository } from "typeorm";
import { FlightTelemetry } from "./../entities/FlightTelemetry";

describe("TelemetryRepository", () => {
  let repository: TelemetryRepository;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockRepo: jest.Mocked<Repository<FlightTelemetry>>;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<FlightTelemetry>>;

    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockRepo),
      query: jest.fn(),
    } as unknown as jest.Mocked<DataSource>;

    repository = new TelemetryRepository(mockDataSource);
  });

  describe("save", () => {
    it("should create and save a telemetry entry", async () => {
      const data = { icao24: "abc", flightId: "uuid" };
      const entry = { ...data, id: "1" } as unknown as FlightTelemetry;
      mockRepo.create.mockReturnValue(entry);
      mockRepo.save.mockResolvedValue(entry);

      const result = await repository.save(data);

      expect(mockRepo.create).toHaveBeenCalledWith(data);
      expect(mockRepo.save).toHaveBeenCalledWith(entry);
      expect(result).toEqual(entry);
    });
  });

  describe("calculateDistances", () => {
    it("should return parsed distances from spatial query", async () => {
      const mockResult = [
        {
          distanceFromOriginKm: "123.456",
          distanceToDestinationKm: "789.012",
        },
      ];
      mockDataSource.query.mockResolvedValue(mockResult);

      const result = await repository.calculateDistances("telemetry-uuid");

      expect(mockDataSource.query).toHaveBeenCalled();
      expect(result).toEqual({
        distanceFromOriginKm: 123.456,
        distanceToDestinationKm: 789.012,
      });
    });

    it("should return nulls if query returns no data", async () => {
      mockDataSource.query.mockResolvedValue([]);

      const result = await repository.calculateDistances("telemetry-uuid");

      expect(result).toEqual({
        distanceFromOriginKm: null,
        distanceToDestinationKm: null,
      });
    });

    it("should handle null values from database", async () => {
      mockDataSource.query.mockResolvedValue([
        {
          distanceFromOriginKm: null,
          distanceToDestinationKm: null,
        },
      ]);

      const result = await repository.calculateDistances("telemetry-uuid");

      expect(result).toEqual({
        distanceFromOriginKm: null,
        distanceToDestinationKm: null,
      });
    });
  });
});
