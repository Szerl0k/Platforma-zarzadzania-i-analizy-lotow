import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User";
import { BaseEntity } from "../../common/database/BaseEntity";

@Entity("refresh_tokens")
export class RefreshToken extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255, name: "token_hash" })
  tokenHash!: string;

  @Index("IDX_refresh_tokens_user_id")
  @Column({ type: "uuid", name: "user_id" })
  userId!: string;

  @Column({ type: "timestamp", precision: 0, name: "expires_at" })
  expiresAt!: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;
}
