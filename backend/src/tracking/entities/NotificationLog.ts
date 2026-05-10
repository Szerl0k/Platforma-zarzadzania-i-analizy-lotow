import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "../../users/entities/User";
import { TrackedFlight } from "./TrackedFlight";
import { FlightStatusChange } from "../../flights/entities/FlightStatusChange";
import { BaseEntity } from "../../common/database/BaseEntity";

@Entity("notification_logs")
@Index(["userId", "readAt", "createdAt"])
export class NotificationLog extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "user_id" })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "uuid", nullable: true, name: "tracked_flight_id" })
  trackedFlightId!: string | null;

  @ManyToOne(() => TrackedFlight, { onDelete: "SET NULL" })
  @JoinColumn({ name: "tracked_flight_id" })
  trackedFlight!: TrackedFlight | null;

  @Column({ type: "uuid", nullable: true, name: "flight_status_change_id" })
  flightStatusChangeId!: string | null;

  @ManyToOne(() => FlightStatusChange, { onDelete: "SET NULL" })
  @JoinColumn({ name: "flight_status_change_id" })
  flightStatusChange!: FlightStatusChange | null;

  @Column({ type: "varchar", length: 50 })
  type!: string;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text" })
  body!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  link!: string | null;

  @Column({
    type: "timestamp with time zone",
    nullable: true,
    name: "read_at",
  })
  readAt!: Date | null;
}
