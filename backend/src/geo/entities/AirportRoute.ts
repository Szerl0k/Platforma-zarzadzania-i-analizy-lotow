import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from "typeorm";
import { Airport } from "./Airport";
import { Airline } from "./Airline";
import { BaseEntity } from "../../common/database/BaseEntity";

@Entity("airport_routes")
@Unique(["originAirportCode", "airlineCode", "destinationAirportCode"])
export class AirportRoute extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "varchar", length: 4, name: "origin_airport_code" })
  originAirportCode!: string;

  @ManyToOne(() => Airport, { onDelete: "CASCADE" })
  @JoinColumn({ name: "origin_airport_code" })
  originAirport!: Airport;

  @Column({ type: "varchar", length: 3, name: "airline_code" })
  airlineCode!: string;

  @ManyToOne(() => Airline, { onDelete: "CASCADE" })
  @JoinColumn({ name: "airline_code" })
  airline!: Airline;

  @Column({ type: "varchar", length: 4, name: "destination_airport_code" })
  destinationAirportCode!: string;

  @ManyToOne(() => Airport, { onDelete: "CASCADE" })
  @JoinColumn({ name: "destination_airport_code" })
  destinationAirport!: Airport;

  @Column({ type: "timestamp with time zone", name: "fetched_at" })
  fetchedAt!: Date;
}
