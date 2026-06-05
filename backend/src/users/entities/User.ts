import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from "typeorm";
import { Role } from "./Role";
import { UserPreferences } from "./UserPreferences";
import { BaseEntity } from "../../common/database/BaseEntity";

@Entity("users")
export class User extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  email!: string;

  @Column({ type: "varchar", length: 255, name: "password_hash" })
  passwordHash!: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  nickname!: string | null;

  @Column({ type: "boolean", name: "email_verified" })
  emailVerified!: boolean;

  @Column({ type: "boolean", default: false })
  blocked!: boolean;

  @Column({
    type: "varchar",
    length: 255,
    nullable: true,
    name: "verification_token",
  })
  verificationToken!: string | null;

  @Column({
    type: "timestamp",
    precision: 0,
    nullable: true,
    name: "verification_token_expires",
  })
  verificationTokenExpires!: Date | null;

  @Column({
    type: "varchar",
    length: 255,
    nullable: true,
    name: "password_reset_token",
  })
  passwordResetToken!: string | null;

  @Column({
    type: "timestamp",
    precision: 0,
    nullable: true,
    name: "password_reset_expires",
  })
  passwordResetExpires!: Date | null;

  @Column({ type: "boolean", name: "profile_public" })
  profilePublic!: boolean;

  @Column({
    type: "timestamp",
    precision: 0,
    nullable: true,
    name: "last_login",
  })
  lastLogin!: Date | null;

  @Column({ type: "int", name: "role_id" })
  roleId!: number;

  @ManyToOne(() => Role)
  @JoinColumn({ name: "role_id" })
  role!: Role;

  @OneToOne(() => UserPreferences, (prefs) => prefs.user)
  preferences!: UserPreferences;
}
