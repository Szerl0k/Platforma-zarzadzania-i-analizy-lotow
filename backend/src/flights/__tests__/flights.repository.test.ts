import { FlightsRepository } from "../flights.repository";
import { DataSource, EntityManager, Repository } from "typeorm";
import { Flight } from "../entities/Flight";
import { FlightStatus } from "../entities/FlightStatus";
import { FlightCodeshare } from "../entities/FlightCodeshare";
import { Airline } from "../../geo/entities/Airline";

describe("FlightsRepository", () => {
  let repository: FlightsRepository;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockManager: jest.Mocked<EntityManager>;

  let mockFlightRepo: jest.Mocked<Repository<Flight>>;
  let mockFlightStatusRepo: jest.Mocked<Repository<FlightStatus>>;
  let mockFlightCodeshareRepo: jest.Mocked<Repository<FlightCodeshare>>;
  let mockAirlineRepo: jest.Mocked<Repository<Airline>>;

  beforeEach(() => {
    mockFlightRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<Flight>>;

    mockFlightStatusRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<FlightStatus>>;

    mockFlightCodeshareRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<FlightCodeshare>>;

    mockAirlineRepo = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Airline>>;

    mockDataSource = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === Flight) return mockFlightRepo;
        if (entity === FlightStatus) return mockFlightStatusRepo;
        if (entity === FlightCodeshare) return mockFlightCodeshareRepo;
        if (entity === Airline) return mockAirlineRepo;
        return null;
      }),
      query: jest.fn(),
    } as unknown as jest.Mocked<DataSource>;

    mockManager = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === Flight) return mockFlightRepo;
        if (entity === FlightStatus) return mockFlightStatusRepo;
        if (entity === FlightCodeshare) return mockFlightCodeshareRepo;
        if (entity === Airline) return mockAirlineRepo;
        return null;
      }),
    } as unknown as jest.Mocked<EntityManager>;

    repository = new FlightsRepository(mockDataSource);
  });

  describe("create", () => {
    it("should create and save a flight without manager", async () => {
      const data = {
        scheduledOut: "2026-06-03T10:00:00Z",
        estimatedOut: "2026-06-03T10:00:00Z",
        actualOut: "2026-06-03T10:00:00Z",
        scheduledIn: "2026-06-03T12:00:00Z",
        estimatedIn: "2026-06-03T12:00:00Z",
        actualIn: "2026-06-03T12:00:00Z",
      } as never;
      const flight = {
        id: "1",
        ...(data as unknown as object),
        updateSchedule: jest.fn(),
      } as unknown as import("../entities/Flight").Flight;

      mockFlightRepo.create.mockReturnValue(flight);
      mockFlightRepo.save.mockResolvedValue(flight);

      const result = await repository.create(data);

      expect(mockDataSource.getRepository).toHaveBeenCalledWith(Flight);
      expect(mockFlightRepo.create).toHaveBeenCalled();
      expect(mockFlightRepo.save).toHaveBeenCalledWith(flight);
      expect(result).toEqual(flight);
    });

    it("should create and save a flight with manager and handle null dates", async () => {
      const data = {
        scheduledOut: undefined,
      } as never;
      const flight = {
        id: "1",
        updateSchedule: jest.fn(),
      } as unknown as import("../entities/Flight").Flight;

      mockFlightRepo.create.mockReturnValue(flight);
      mockFlightRepo.save.mockResolvedValue(flight);

      const result = await repository.create(data, mockManager);

      expect(mockManager.getRepository).toHaveBeenCalledWith(Flight);
      expect(result).toEqual(flight);
    });
  });

  describe("update", () => {
    it("should return null if flight not found", async () => {
      mockFlightRepo.findOne.mockResolvedValue(null);
      const result = await repository.update("1", {} as never);
      expect(result).toBeNull();
    });

    it("should update and save the flight with specific dates", async () => {
      const flight = {
        id: "1",
        updateSchedule: jest.fn(),
      } as unknown as import("../entities/Flight").Flight;
      mockFlightRepo.findOne.mockResolvedValue(flight);
      mockFlightRepo.save.mockResolvedValue(flight);

      const data = {
        scheduledOut: "2026-06-03T10:00:00Z",
        estimatedOut: "2026-06-03T10:00:00Z",
        actualOut: "2026-06-03T10:00:00Z",
        scheduledIn: "2026-06-03T12:00:00Z",
        estimatedIn: "2026-06-03T12:00:00Z",
        actualIn: "2026-06-03T12:00:00Z",
      } as never;

      const result = await repository.update("1", data, mockManager);

      expect(mockManager.getRepository).toHaveBeenCalledWith(Flight);
      expect(mockFlightRepo.findOne).toHaveBeenCalledWith({
        where: { id: "1" },
      });
      expect(mockFlightRepo.save).toHaveBeenCalledWith(flight);
      expect(result).toEqual(flight);
    });

    it("should update and set dates to null when falsy", async () => {
      const flight = {
        id: "1",
        updateSchedule: jest.fn(),
      } as unknown as import("../entities/Flight").Flight;
      mockFlightRepo.findOne.mockResolvedValue(flight);
      mockFlightRepo.save.mockResolvedValue(flight);

      const data = {
        scheduledOut: null,
        estimatedOut: null,
        actualOut: null,
        scheduledIn: null,
        estimatedIn: null,
        actualIn: null,
      } as never;

      const result = await repository.update("1", data);

      expect(flight.updateSchedule).toHaveBeenCalledWith(data);
      expect(mockFlightRepo.save).toHaveBeenCalledWith(flight);
    });

    it("should not update dates when undefined", async () => {
      const flight = {
        id: "1",
        scheduledOut: new Date(),
        updateSchedule: jest.fn(),
      } as unknown as import("../entities/Flight").Flight;
      mockFlightRepo.findOne.mockResolvedValue(flight);
      mockFlightRepo.save.mockResolvedValue(flight);

      const data = {} as never;

      const result = await repository.update("1", data);

      expect(mockFlightRepo.save).toHaveBeenCalledWith(flight);
    });
  });

  describe("findById", () => {
    it("should return flight by id", async () => {
      const flight = {
        id: "1",
      } as unknown as import("../entities/Flight").Flight;
      mockFlightRepo.findOne.mockResolvedValue(flight);
      const result = await repository.findById("1", ["relations"]);
      expect(mockFlightRepo.findOne).toHaveBeenCalledWith({
        where: { id: "1" },
        relations: ["relations"],
      });
      expect(result).toEqual(flight);
    });

    it("should return flight by id with default parameters", async () => {
      const flight = {
        id: "1",
      } as unknown as import("../entities/Flight").Flight;
      mockFlightRepo.findOne.mockResolvedValue(flight);
      const result = await repository.findById("1");
      expect(mockFlightRepo.findOne).toHaveBeenCalledWith({
        where: { id: "1" },
        relations: [],
      });
      expect(result).toEqual(flight);
    });
  });

  describe("findByFaFlightId", () => {
    it("should return flight by faFlightId", async () => {
      const flight = {
        id: "1",
      } as unknown as import("../entities/Flight").Flight;
      mockFlightRepo.findOne.mockResolvedValue(flight);
      const result = await repository.findByFaFlightId("FA1", [], mockManager);
      expect(mockManager.getRepository).toHaveBeenCalledWith(Flight);
      expect(result).toEqual(flight);
    });

    it("should return flight by faFlightId with default parameters", async () => {
      const flight = {
        id: "1",
      } as unknown as import("../entities/Flight").Flight;
      mockFlightRepo.findOne.mockResolvedValue(flight);
      const result = await repository.findByFaFlightId("FA1");
      expect(mockDataSource.getRepository).toHaveBeenCalledWith(Flight);
      expect(result).toEqual(flight);
    });
  });

  describe("findByCallsign", () => {
    it("should return flight by callsign", async () => {
      const flight = {
        id: "1",
      } as unknown as import("../entities/Flight").Flight;
      mockFlightRepo.findOne.mockResolvedValue(flight);
      const result = await repository.findByCallsign("CALL1");
      expect(mockFlightRepo.findOne).toHaveBeenCalledWith({
        where: { callsign: "CALL1" },
        relations: [],
        order: { updatedAt: "DESC" },
      });
      expect(result).toEqual(flight);
    });

    it("should return flight by callsign with specific relations", async () => {
      const flight = {
        id: "1",
      } as unknown as import("../entities/Flight").Flight;
      mockFlightRepo.findOne.mockResolvedValue(flight);
      const result = await repository.findByCallsign("CALL1", ["rel"]);
      expect(mockFlightRepo.findOne).toHaveBeenCalledWith({
        where: { callsign: "CALL1" },
        relations: ["rel"],
        order: { updatedAt: "DESC" },
      });
      expect(result).toEqual(flight);
    });
  });

  describe("findFlightsByIdentAndDateRange", () => {
    let mockQueryBuilder: any;

    beforeEach(() => {
      mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: "1" }]),
      };
      mockFlightRepo.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder) as any;
    });

    it("should query flights by ident only if no dates provided", async () => {
      const result = await repository.findFlightsByIdentAndDateRange("LOT123");
      expect(mockFlightRepo.createQueryBuilder).toHaveBeenCalledWith("flight");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "(flight.callsign = :ident OR flight.ident_icao = :ident OR flight.ident_iata = :ident)",
        { ident: "LOT123" },
      );
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        "flight.scheduled_out",
        "DESC",
      );
      expect(result).toEqual([{ id: "1" }]);
    });

    it("should include date range query if both dates provided", async () => {
      await repository.findFlightsByIdentAndDateRange(
        "LOT123",
        "2026-06-01",
        "2026-06-03",
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "((flight.scheduled_out >= :start AND flight.scheduled_out <= :end) OR (flight.scheduled_in >= :start AND flight.scheduled_in <= :end))",
        {
          start: new Date("2026-06-01T00:00:00Z"),
          end: new Date("2026-06-03T23:59:59.999Z"),
        },
      );
    });

    it("should include date range query with default start date if only endDateStr provided", async () => {
      await repository.findFlightsByIdentAndDateRange(
        "LOT123",
        undefined,
        "2026-06-03",
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.any(String),
        {
          start: new Date("1970-01-01T00:00:00Z"),
          end: new Date("2026-06-03T23:59:59.999Z"),
        },
      );
    });

    it("should include date range query with default end date if only startDateStr provided", async () => {
      await repository.findFlightsByIdentAndDateRange(
        "LOT123",
        "2026-06-01",
        undefined,
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.any(String),
        {
          start: new Date("2026-06-01T00:00:00Z"),
          end: new Date("2099-12-31T23:59:59.999Z"),
        },
      );
    });
  });

  describe("find", () => {
    it("should return array of flights", async () => {
      const flights = [{ id: "1" }] as never;
      mockFlightRepo.find.mockResolvedValue(flights);
      const result = await repository.find({ take: 10 });
      expect(mockFlightRepo.find).toHaveBeenCalledWith({ take: 10 });
      expect(result).toEqual(flights);
    });
  });

  describe("delete", () => {
    it("should delete flight and return true if affected", async () => {
      mockFlightRepo.delete.mockResolvedValue({
        affected: 1,
      } as unknown as import("typeorm").DeleteResult);
      const result = await repository.delete("1");
      expect(mockFlightRepo.delete).toHaveBeenCalledWith("1");
      expect(result).toBe(true);
    });
    it("should delete flight and return false if not affected", async () => {
      mockFlightRepo.delete.mockResolvedValue({
        affected: 0,
      } as unknown as import("typeorm").DeleteResult);
      const result = await repository.delete("1");
      expect(result).toBe(false);
    });
    it("should delete flight and return false if affected is null", async () => {
      mockFlightRepo.delete.mockResolvedValue({
        affected: null,
      } as unknown as import("typeorm").DeleteResult);
      const result = await repository.delete("1");
      expect(result).toBe(false);
    });
  });

  describe("findOrCreateStatus", () => {
    it("should return existing status", async () => {
      const status = { id: "1", name: "Scheduled" } as never;
      mockFlightStatusRepo.findOne.mockResolvedValue(status);
      const result = await repository.findOrCreateStatus("Scheduled");
      expect(result).toEqual(status);
    });
    it("should create and return new status if not found", async () => {
      mockFlightStatusRepo.findOne.mockResolvedValue(null);
      const newStatus = { name: "Scheduled", category: null } as never;
      mockFlightStatusRepo.create.mockReturnValue(newStatus);
      mockFlightStatusRepo.save.mockResolvedValue(newStatus);

      const result = await repository.findOrCreateStatus(
        "Scheduled",
        mockManager,
      );
      expect(mockManager.getRepository).toHaveBeenCalledWith(FlightStatus);
      expect(mockFlightStatusRepo.create).toHaveBeenCalledWith({
        name: "Scheduled",
        category: null,
      });
      expect(mockFlightStatusRepo.save).toHaveBeenCalledWith(newStatus);
      expect(result).toEqual(newStatus);
    });
  });

  describe("syncCodeshares", () => {
    it("should not create codeshare if existing", async () => {
      mockFlightCodeshareRepo.findOne.mockResolvedValue({} as never);
      await repository.syncCodeshares("1", ["AA123"]);
      expect(mockFlightCodeshareRepo.create).not.toHaveBeenCalled();
    });

    it("should create codeshare and find marketing airline", async () => {
      mockFlightCodeshareRepo.findOne.mockResolvedValue(null);
      const airline = { icaoCode: "AAL" } as never;
      mockAirlineRepo.findOne.mockResolvedValue(airline);
      mockFlightCodeshareRepo.create.mockReturnValue({} as unknown as never);

      await repository.syncCodeshares("1", ["AA123"]);

      expect(mockAirlineRepo.findOne).toHaveBeenCalledWith({
        where: { iataCode: "AA" },
      });
      expect(mockFlightCodeshareRepo.create).toHaveBeenCalledWith({
        flightId: "1",
        marketingIdentIata: "AA123",
        marketingAirlineIcao: "AAL",
        marketingAirline: airline,
      });
      expect(mockFlightCodeshareRepo.save).toHaveBeenCalled();
    });

    it("should create codeshare without marketing airline", async () => {
      mockFlightCodeshareRepo.findOne.mockResolvedValue(null);
      mockAirlineRepo.findOne.mockResolvedValue(null);
      mockFlightCodeshareRepo.create.mockReturnValue({} as unknown as never);

      await repository.syncCodeshares("1", ["AA123"], mockManager);

      expect(mockFlightCodeshareRepo.create).toHaveBeenCalledWith({
        flightId: "1",
        marketingIdentIata: "AA123",
        marketingAirlineIcao: null,
        marketingAirline: undefined,
      });
      expect(mockFlightCodeshareRepo.save).toHaveBeenCalled();
    });
  });

  describe("getFlightPath", () => {
    it("should return traveled and remaining paths", async () => {
      const mockResult = [
        {
          traveled: JSON.stringify({ type: "LineString" }),
          remaining: JSON.stringify({ type: "LineString" }),
        },
      ];
      mockDataSource.query.mockResolvedValue(mockResult);

      const result = await repository.getFlightPath("1");
      expect(mockDataSource.query).toHaveBeenCalled();
      expect(result).toEqual({
        traveled: { type: "LineString" },
        remaining: { type: "LineString" },
      });
    });

    it("should handle null results from database", async () => {
      const mockResult = [
        {
          traveled: null,
          remaining: null,
        },
      ];
      mockDataSource.query.mockResolvedValue(mockResult);

      const result = await repository.getFlightPath("1");
      expect(result).toEqual({
        traveled: null,
        remaining: null,
      });
    });

    it("should return nulls if query returns empty array", async () => {
      mockDataSource.query.mockResolvedValue([]);
      const result = await repository.getFlightPath("1");
      expect(result).toEqual({
        traveled: null,
        remaining: null,
      });
    });

    it("should return nulls if query returns undefined", async () => {
      mockDataSource.query.mockResolvedValue(undefined as unknown);
      const result = await repository.getFlightPath("1");
      expect(result).toEqual({
        traveled: null,
        remaining: null,
      });
    });
  });
});
