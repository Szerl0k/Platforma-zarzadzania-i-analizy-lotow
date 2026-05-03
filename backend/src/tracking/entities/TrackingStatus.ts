import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { BaseEntity } from "../../common/database/BaseEntity";

@Entity("tracking_statuses")
export class TrackingStatus extends BaseEntity {
  @PrimaryGeneratedColumn("increment")
  id!: number;

  @Column({ type: "varchar", length: 50, unique: true, nullable: false })
  name!: string;
}
