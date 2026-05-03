import { Entity, PrimaryColumn, Column } from "typeorm";
import { BaseEntity } from "../../common/database/BaseEntity";

@Entity("airlines")
export class Airline extends BaseEntity {
  @PrimaryColumn({ type: "varchar", length: 3, name: "icao_code" })
  icaoCode!: string;

  @Column({
    type: "varchar",
    length: 2,
    unique: true,
    name: "iata_code",
    nullable: true,
  })
  iataCode!: string | null;

  @Column({ type: "varchar", nullable: false })
  name!: string;
}
