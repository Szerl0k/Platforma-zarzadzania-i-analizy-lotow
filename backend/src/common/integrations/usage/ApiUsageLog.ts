import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from "typeorm";

export type ApiUsageProvider = "opensky" | "aeroapi";

@Entity("api_usage_logs")
@Index("IDX_api_usage_provider_called_at", ["provider", "calledAt"])
export class ApiUsageLog {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ type: "varchar", length: 16 })
  provider!: ApiUsageProvider;

  @Column({ type: "varchar", length: 255 })
  endpoint!: string;

  @Column({ type: "int", name: "status_code", nullable: true })
  statusCode!: number | null;

  @Column({ type: "boolean" })
  success!: boolean;

  @Column({ type: "int", name: "duration_ms" })
  durationMs!: number;

  @CreateDateColumn({
    name: "called_at",
    type: "timestamp",
    precision: 3,
  })
  calledAt!: Date;
}
