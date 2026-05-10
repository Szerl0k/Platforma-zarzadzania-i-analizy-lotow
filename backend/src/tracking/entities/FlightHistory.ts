import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../../users/entities/User";
import { Flight } from "../../flights/entities/Flight";
import { BaseEntity } from "../../common/database/BaseEntity";

@Entity("flight_history")
export class FlightHistory extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "user_id" })
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "uuid", nullable: true, name: "flight_id" })
  flightId!: string | null;

  @ManyToOne(() => Flight)
  @JoinColumn({ name: "flight_id" })
  flight!: Flight | null;

  @Column({ type: "date", name: "travel_date" })
  travelDate!: string;

  @Column({ type: "varchar", length: 10, nullable: true, name: "seat_number" })
  seatNumber!: string | null;

  @Column({
    type: "varchar",
    length: 20,
    nullable: true,
    name: "booking_reference",
  })
  bookingReference!: string | null;

  @Column({ type: "int", nullable: true, name: "cabin_class" })
  cabinClass!: number | null;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Column({ type: "boolean", nullable: true, name: "was_delayed" })
  wasDelayed!: boolean | null;

  @Column({ type: "int", nullable: true, name: "delay_minutes" })
  delayMinutes!: number | null;

  @Column({
    type: "decimal",
    precision: 2,
    scale: 1,
    nullable: true,
    name: "user_rating",
  })
  userRating!: number | null;
}
