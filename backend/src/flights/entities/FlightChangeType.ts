import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { BaseEntity } from "../../common/database/BaseEntity";

@Entity("flight_change_types")
export class FlightChangeType extends BaseEntity {
  @PrimaryGeneratedColumn("increment")
  id!: number;

  @Column({ type: "varchar", length: 50, unique: true, nullable: false })
  name!: string;
}
