import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { BaseEntity } from "../../common/database/BaseEntity";

@Entity("flight_statuses")
export class FlightStatus extends BaseEntity {
  @PrimaryGeneratedColumn("increment")
  id!: number;

  @Column({ type: "varchar", unique: true, nullable: false })
  name!: string;

  @Column({ type: "varchar", nullable: true })
  category!: string | null;
}
