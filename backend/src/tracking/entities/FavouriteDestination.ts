import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../../users/entities/User";
import { Airport } from "../../geo/entities/Airport";
import { BaseEntity } from "../../common/database/BaseEntity";

@Entity("favorite_destinations")
export class FavouriteDestination extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "user_id" })
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "varchar", length: 4, name: "airport_icao" })
  airportIcao!: string;

  @ManyToOne(() => Airport)
  @JoinColumn({ name: "airport_icao", referencedColumnName: "icaoCode" })
  airport!: Airport;

  @Column({ type: "text", nullable: true })
  notes!: string | null;
}
