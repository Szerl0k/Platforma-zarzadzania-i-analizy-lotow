import {
  DataSource,
  EntityManager,
  Repository,
  FindManyOptions,
  EntityTarget,
  ObjectLiteral,
  FindOptionsWhere,
} from "typeorm";
import { AppDataSource } from "../common/database/data-source";
import { Flight } from "./entities/Flight";
import { FlightStatus } from "./entities/FlightStatus";
import { FlightCodeshare } from "./entities/FlightCodeshare";
import { Airline } from "../geo/entities/Airline";
import { CreateFlightDTO, UpdateFlightDTO } from "./flights.dto";

/**
 * Repository handling database operations for Flight and related entities,
 * including relational lifecycle management.
 */
export class FlightsRepository {
  private readonly repository: Repository<Flight>;

  constructor(private readonly dataSource: DataSource = AppDataSource) {
    this.repository = this.dataSource.getRepository(Flight);
  }

  private getRepository<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
    manager?: EntityManager,
  ): Repository<T> {
    return manager
      ? manager.getRepository(entity)
      : this.dataSource.getRepository(entity);
  }

  public async create(
    data: CreateFlightDTO,
    manager?: EntityManager,
  ): Promise<Flight> {
    const repo = this.getRepository(Flight, manager);
    const {
      scheduledOut,
      estimatedOut,
      actualOut,
      scheduledIn,
      estimatedIn,
      actualIn,
      ...primitiveData
    } = data;

    const flight = repo.create(primitiveData as Partial<Flight>);
    flight.updateSchedule(data);
    return await repo.save(flight);
  }

  public async update(
    id: string,
    data: UpdateFlightDTO,
    manager?: EntityManager,
  ): Promise<Flight | null> {
    const repo = this.getRepository(Flight, manager);
    const flight = await repo.findOne({
      where: { id } as FindOptionsWhere<Flight>,
    });
    if (!flight) return null;

    flight.updateSchedule(data);

    const {
      scheduledOut,
      estimatedOut,
      actualOut,
      scheduledIn,
      estimatedIn,
      actualIn,
      ...primitiveData
    } = data;

    Object.assign(flight, primitiveData);
    return await repo.save(flight);
  }

  public async findById(
    id: string,
    relations: string[] = [],
    manager?: EntityManager,
  ): Promise<Flight | null> {
    const repo = this.getRepository(Flight, manager);
    return await repo.findOne({
      where: { id } as FindOptionsWhere<Flight>,
      relations,
    });
  }

  public async findByFaFlightId(
    faFlightId: string,
    relations: string[] = [],
    manager?: EntityManager,
  ): Promise<Flight | null> {
    const repo = this.getRepository(Flight, manager);
    return await repo.findOne({
      where: { faFlightId } as FindOptionsWhere<Flight>,
      relations,
    });
  }

  public async findByCallsign(
    callsign: string,
    relations: string[] = [],
  ): Promise<Flight | null> {
    return await this.repository.findOne({
      where: { callsign } as FindOptionsWhere<Flight>,
      relations,
      order: { updatedAt: "DESC" },
    });
  }

  /**
   * Retrieves flights matching a given identifier within an optional date range.
   */
  public async findFlightsByIdentAndDateRange(
    ident: string,
    startDateStr?: string,
    endDateStr?: string,
  ): Promise<Flight[]> {
    const queryBuilder = this.repository.createQueryBuilder("flight");

    queryBuilder
      .leftJoinAndSelect("flight.status", "status")
      .leftJoinAndSelect("flight.origin", "origin")
      .leftJoinAndSelect("origin.city", "originCity")
      .leftJoinAndSelect("originCity.country", "originCountry")
      .leftJoinAndSelect("flight.destination", "destination")
      .leftJoinAndSelect("destination.city", "destCity")
      .leftJoinAndSelect("destCity.country", "destCountry")
      .leftJoinAndSelect("flight.operatingAirline", "operatingAirline")
      .leftJoinAndSelect("flight.codeshares", "codeshares");

    queryBuilder.where(
      "(flight.callsign = :ident OR flight.ident_icao = :ident OR flight.ident_iata = :ident)",
      { ident },
    );

    if (startDateStr || endDateStr) {
      const start = startDateStr
        ? new Date(`${startDateStr}T00:00:00Z`)
        : new Date("1970-01-01T00:00:00Z");
      const end = endDateStr
        ? new Date(`${endDateStr}T23:59:59.999Z`)
        : new Date("2099-12-31T23:59:59.999Z");

      queryBuilder.andWhere(
        "((flight.scheduled_out >= :start AND flight.scheduled_out <= :end) OR (flight.scheduled_in >= :start AND flight.scheduled_in <= :end))",
        { start, end },
      );
    }

    queryBuilder.orderBy("flight.scheduled_out", "DESC");
    return await queryBuilder.getMany();
  }

  public async find(options?: FindManyOptions<Flight>): Promise<Flight[]> {
    return await this.repository.find(options);
  }

  public async delete(id: string, manager?: EntityManager): Promise<boolean> {
    const repo = this.getRepository(Flight, manager);
    const result = await repo.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  /**
   * Finds a flight status by name or creates it if it doesn't exist.
   */
  public async findOrCreateStatus(
    name: string,
    manager?: EntityManager,
  ): Promise<FlightStatus> {
    const statusRepo = this.getRepository(FlightStatus, manager);
    let status = await statusRepo.findOne({
      where: { name } as FindOptionsWhere<FlightStatus>,
    });

    if (!status) {
      status = statusRepo.create({ name, category: null });
      await statusRepo.save(status);
    }
    return status;
  }

  /**
   * Synchronizes codeshare information for a specific flight.
   */
  public async syncCodeshares(
    flightId: string,
    codeshareIatas: string[],
    manager?: EntityManager,
  ): Promise<void> {
    const codeshareRepo = this.getRepository(FlightCodeshare, manager);
    const airlineRepo = this.getRepository(Airline, manager);

    for (const codeshareIata of codeshareIatas) {
      const existing = await codeshareRepo.findOne({
        where: {
          flightId,
          marketingIdentIata: codeshareIata,
        } as FindOptionsWhere<FlightCodeshare>,
      });

      if (!existing) {
        const marketingAirlineCode = codeshareIata.substring(0, 2);
        const marketingAirline = await airlineRepo.findOne({
          where: {
            iataCode: marketingAirlineCode,
          } as FindOptionsWhere<Airline>,
        });

        const codeshare = codeshareRepo.create({
          flightId,
          marketingIdentIata: codeshareIata,
          marketingAirlineIcao: marketingAirline?.icaoCode || null,
          marketingAirline: marketingAirline || undefined,
        });

        await codeshareRepo.save(codeshare);
      }
    }
  }

  /**
   * Calculates the flight path segments (Traveled: Origin -> Current, Remaining: Current -> Destination)
   * using PostGIS spatial functions (ST_MakeLine, ST_Segmentize) to ensure Great Circle accuracy.
   *
   * @param flightId - The UUID of the flight.
   * @returns An object containing GeoJSON geometries for 'traveled' and 'remaining' segments.
   */
  public async getFlightPath(flightId: string): Promise<{
    traveled: Record<string, unknown> | null;
    remaining: Record<string, unknown> | null;
  }> {
    const query = `
      SELECT 
        ST_AsGeoJSON(
          ST_Segmentize(
            ST_MakeLine(o.location::geometry, t.location::geometry)::geography,
            50000
          )
        ) as traveled,
        ST_AsGeoJSON(
          ST_Segmentize(
            ST_MakeLine(COALESCE(t.location, o.location)::geometry, d.location::geometry)::geography,
            50000
          )
        ) as remaining
      FROM flights f
      JOIN airports o ON f.origin_icao = o.icao_code
      JOIN airports d ON f.destination_icao = d.icao_code
      LEFT JOIN LATERAL (
        SELECT location FROM flight_telemetry 
        WHERE flight_id = f.id 
        ORDER BY timestamp DESC LIMIT 1
      ) t ON TRUE
      WHERE f.id = $1;
    `;

    const result = (await this.dataSource.query(query, [flightId])) as Array<{
      traveled: string | null;
      remaining: string | null;
    }>;

    if (!result || result.length === 0) {
      return { traveled: null, remaining: null };
    }

    return {
      traveled: result[0].traveled
        ? (JSON.parse(result[0].traveled) as Record<string, unknown>)
        : null,
      remaining: result[0].remaining
        ? (JSON.parse(result[0].remaining) as Record<string, unknown>)
        : null,
    };
  }
}
