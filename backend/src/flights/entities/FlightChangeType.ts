import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('flight_change_types')
export class FlightChangeType {
    @PrimaryGeneratedColumn('increment')
    id!: number;

    @Column({ type: 'varchar', length: 50, unique: true, nullable: false })
    name!: string;
}
