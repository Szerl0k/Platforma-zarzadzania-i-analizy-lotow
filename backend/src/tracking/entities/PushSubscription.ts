import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "../../users/entities/User";
import { BaseEntity } from "../../common/database/BaseEntity";

/**
 * A browser Web Push subscription (one row per device/browser of a user).
 * `endpoint` is unique — re-subscribing the same browser upserts this row.
 */
@Entity("push_subscriptions")
@Index(["userId"])
export class PushSubscription extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "user_id" })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "text", unique: true })
  endpoint!: string;

  @Column({ type: "varchar", length: 255 })
  p256dh!: string;

  @Column({ type: "varchar", length: 255 })
  auth!: string;
}
