import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('flight_statuses')
export class FlightStatus {

    @PrimaryGeneratedColumn('increment')
    id!: number;

    @Column({type: 'varchar', unique: true, nullable: false})
    name!: string;

    @Column({type: 'varchar', nullable: true})
    category!: string | null;
}