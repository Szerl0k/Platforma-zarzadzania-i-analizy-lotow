import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";
import { BaseEntity } from "../../common/database/BaseEntity";

@Entity("user_preferences")
export class UserPreferences extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "user_id" })
  userId!: string;

  @OneToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "boolean", name: "email_notifications" })
  emailNotifications!: boolean;

  @Column({ type: "boolean", name: "push_notifications" })
  pushNotifications!: boolean;

  @Column({ type: "boolean", name: "notify_on_delay" })
  notifyOnDelay!: boolean;

  @Column({ type: "boolean", name: "notify_on_gate_change" })
  notifyOnGateChange!: boolean;

  @Column({ type: "boolean", name: "notify_on_status_change" })
  notifyOnStatusChange!: boolean;

  @Column({ type: "integer", name: "delay_threshold_minutes" })
  delayThresholdMinutes!: number;

  @Column({ type: "varchar", length: 50 })
  timezone!: string;

  @Column({ type: "varchar", length: 10, name: "distance_unit" })
  distanceUnit!: string;
}
