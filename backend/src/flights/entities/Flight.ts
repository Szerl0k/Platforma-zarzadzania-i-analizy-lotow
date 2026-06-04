import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from "typeorm";
import { Airline } from "../../geo/entities/Airline";
import { Airport } from "../../geo/entities/Airport";
import { FlightStatus } from "./FlightStatus";
import { FlightCodeshare } from "./FlightCodeshare";
import { FlightTelemetry } from "../../telemetry/entities/FlightTelemetry";
import { BaseEntity } from "../../common/database/BaseEntity";

@Entity("flights")
export class Flight extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // Nullable false, przechowywane będą wyłącznie loty komercyjne, które muszą miec ICAO
  // TODO: w Serwisach zaimplementować odrzucanie wyników z AeroAPI, które nie posiadają ident_icao lub atc_ident
  @Index()
  @Column({ type: "varchar", nullable: false, name: "ident_icao" })
  identIcao!: string;

  @Column({ type: "varchar", nullable: true, name: "ident_iata" })
  identIata!: string | null;

  @Column({
    type: "varchar",
    length: 3,
    nullable: true,
    name: "operating_airline_icao",
  })
  operatingAirlineIcao!: string | null;

  @ManyToOne(() => Airline)
  @JoinColumn({ name: "operating_airline_icao" })
  operatingAirline!: Airline | null;

  // W OpenSky Network API: pole 'callsign'
  // W AeroAPI: pole 'atc_ident'
  // Jesli AeroAPI zwraca null, to należy tutaj przekazać identIcao
  @Index()
  @Column({ type: "varchar", nullable: false, name: "callsign" })
  callsign!: string;

  @Index({ unique: true })
  @Column({
    type: "varchar",
    nullable: true,
    name: "fa_flight_id",
  })
  faFlightId!: string | null;

  @Column({ type: "varchar", length: 4, nullable: true, name: "origin_icao" })
  originIcao!: string | null;

  @ManyToOne(() => Airport)
  @JoinColumn({ name: "origin_icao" })
  origin!: Airport | null;

  @Column({
    type: "varchar",
    length: 4,
    nullable: true,
    name: "destination_icao",
  })
  destinationIcao!: string | null;

  @ManyToOne(() => Airport)
  @JoinColumn({ name: "destination_icao" })
  destination!: Airport | null;

  @Index()
  @Column({ type: "int", name: "status_id" })
  statusId!: number;

  @ManyToOne(() => FlightStatus)
  @JoinColumn({ name: "status_id" })
  status!: FlightStatus;

  @Column({
    type: "varchar",
    length: 10,
    nullable: true,
    name: "terminal_origin",
  })
  terminalOrigin!: string | null;

  @Column({ type: "varchar", length: 10, nullable: true, name: "gate_origin" })
  gateOrigin!: string | null;

  @Column({
    type: "varchar",
    length: 10,
    nullable: true,
    name: "terminal_destination",
  })
  terminalDestination!: string | null;

  @Column({
    type: "varchar",
    length: 10,
    nullable: true,
    name: "gate_destination",
  })
  gateDestination!: string | null;

  @Column({ type: "int", nullable: true, name: "departure_delay" })
  departureDelay!: number | null;

  @Column({ type: "int", nullable: true, name: "arrival_delay" })
  arrivalDelay!: number | null;

  @Index()
  @Column({ type: "timestamptz", nullable: true, name: "scheduled_out" })
  scheduledOut!: Date | null;

  @Column({ type: "timestamptz", nullable: true, name: "estimated_out" })
  estimatedOut!: Date | null;

  @Column({ type: "timestamptz", nullable: true, name: "actual_out" })
  actualOut!: Date | null;

  @Column({ type: "timestamptz", nullable: true, name: "scheduled_in" })
  scheduledIn!: Date | null;

  @Column({ type: "timestamptz", nullable: true, name: "estimated_in" })
  estimatedIn!: Date | null;

  @Column({ type: "timestamptz", nullable: true, name: "actual_in" })
  actualIn!: Date | null;

  @OneToMany(() => FlightCodeshare, (codeshare) => codeshare.flight)
  codeshares!: FlightCodeshare[];

  @OneToMany(() => FlightTelemetry, (telemetry) => telemetry.flight)
  telemetry!: FlightTelemetry[];

  /**
   * Encapsulates the logic for updating flight schedule timestamps.
   */
  public updateSchedule(timestamps: {
    scheduledOut?: Date | string | null;
    estimatedOut?: Date | string | null;
    actualOut?: Date | string | null;
    scheduledIn?: Date | string | null;
    estimatedIn?: Date | string | null;
    actualIn?: Date | string | null;
  }): void {
    if (timestamps.scheduledOut !== undefined) {
      this.scheduledOut = timestamps.scheduledOut
        ? new Date(timestamps.scheduledOut)
        : null;
    }
    if (timestamps.estimatedOut !== undefined) {
      this.estimatedOut = timestamps.estimatedOut
        ? new Date(timestamps.estimatedOut)
        : null;
    }
    if (timestamps.actualOut !== undefined) {
      this.actualOut = timestamps.actualOut
        ? new Date(timestamps.actualOut)
        : null;
    }
    if (timestamps.scheduledIn !== undefined) {
      this.scheduledIn = timestamps.scheduledIn
        ? new Date(timestamps.scheduledIn)
        : null;
    }
    if (timestamps.estimatedIn !== undefined) {
      this.estimatedIn = timestamps.estimatedIn
        ? new Date(timestamps.estimatedIn)
        : null;
    }
    if (timestamps.actualIn !== undefined) {
      this.actualIn = timestamps.actualIn
        ? new Date(timestamps.actualIn)
        : null;
    }
  }

  /**
   * Domain-specific query method to determine if the flight is currently delayed.
   */
  public isDelayed(): boolean {
    return (
      (this.departureDelay !== null && this.departureDelay > 0) ||
      (this.arrivalDelay !== null && this.arrivalDelay > 0)
    );
  }
}
