import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Point } from "geojson";
import { Flight } from "../../flights/entities/Flight";
import { HexIcao24AddressTransformer } from "../../common/utils/HexTransformer";
import { BaseEntity } from "../../common/database/BaseEntity";

/**
 * Entity representing a single telemetry data point for a flight.
 * Stores spatial location, altitude, velocity, and orientation at a specific point in time.
 */
@Entity("flight_telemetry")
@Index(["flightId", "timestamp"])
export class FlightTelemetry extends BaseEntity {
  /** Unique identifier for the telemetry entry. */
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id!: string;

  /** 24-bit ICAO aircraft address in hex format. */
  @Column({
    type: "integer",
    name: "icao24",
    transformer: HexIcao24AddressTransformer,
  })
  icao24!: string;

  /** Internal UUID reference to the associated Flight entity. */
  @Column({ type: "uuid", name: "flight_id" })
  flightId!: string;

  /** Reference to the Flight entity. */
  @ManyToOne(() => Flight, (flight) => flight.telemetry)
  @JoinColumn({ name: "flight_id" })
  flight!: Flight;

  /** Point in time when the telemetry was recorded. */
  @Column({ type: "timestamptz", nullable: false })
  timestamp!: Date;

  /** Geospatial location (Point) in WGS84 (SRID 4326). */
  @Index({ spatial: true })
  @Column({
    type: "geometry",
    spatialFeatureType: "Point",
    srid: 4326,
    nullable: false,
  })
  location!: Point;

  /** Barometric altitude in feet. */
  @Column({ type: "int", nullable: true })
  altitude!: number | null;

  /** Ground speed in knots. */
  @Column({ type: "decimal", precision: 7, scale: 2, nullable: true })
  velocity!: number | null;

  /** Magnetic heading in degrees (0-359). */
  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  heading!: number | null;

  /** Indicates if the aircraft was on the ground at the time of recording. */
  @Column({ type: "boolean", nullable: false, name: "on_ground" })
  onGround!: boolean;
}
