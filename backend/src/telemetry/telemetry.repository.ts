import { DataSource, Repository, EntityManager } from "typeorm";
import { AppDataSource } from "../common/database/data-source";
import { FlightTelemetry } from "./entities/FlightTelemetry";

export interface TelemetryDistances {
  distanceFromOriginKm: number | null;
  distanceToDestinationKm: number | null;
}

/**
 * Repository handling database operations for FlightTelemetry,
 * including complex PostGIS spatial calculations.
 */
export class TelemetryRepository {
  private readonly repository: Repository<FlightTelemetry>;

  constructor(private readonly dataSource: DataSource = AppDataSource) {
    this.repository = this.dataSource.getRepository(FlightTelemetry);
  }

  private getRepository(manager?: EntityManager): Repository<FlightTelemetry> {
    return manager ? manager.getRepository(FlightTelemetry) : this.repository;
  }

  /**
   * Persists a new telemetry entry.
   *
   * @param data - Partial telemetry entity data.
   * @param manager - Optional EntityManager for transactions.
   */
  public async save(
    data: Partial<FlightTelemetry>,
    manager?: EntityManager,
  ): Promise<FlightTelemetry> {
    const repo = this.getRepository(manager);
    const entry = repo.create(data);
    return await repo.save(entry);
  }

  /**
   * Calculates real-time distances between the current telemetry point and
   * the flight's origin and destination airports using PostGIS geography types.
   *
   * @param telemetryId - The UUID of the persisted telemetry record.
   * @returns Calculated distances in kilometers.
   */
  public async calculateDistances(
    telemetryId: string,
  ): Promise<TelemetryDistances> {
    const [distances] = await this.dataSource.query(
      `
      SELECT 
        ST_Distance(t.location::geography, origin.location::geography) / 1000 as "distanceFromOriginKm",
        ST_Distance(t.location::geography, dest.location::geography) / 1000 as "distanceToDestinationKm"
      FROM flight_telemetry t
      JOIN flights f ON f.id = t.flight_id
      LEFT JOIN airports origin ON origin.icao_code = f.origin_icao
      LEFT JOIN airports dest ON dest.icao_code = f.destination_icao
      WHERE t.id = $1
      `,
      [telemetryId],
    );

    return {
      distanceFromOriginKm: distances?.distanceFromOriginKm
        ? parseFloat(distances.distanceFromOriginKm)
        : null,
      distanceToDestinationKm: distances?.distanceToDestinationKm
        ? parseFloat(distances.distanceToDestinationKm)
        : null,
    };
  }
}
