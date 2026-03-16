import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('simulation_statuses')
export class SimulationStatus {
    @PrimaryGeneratedColumn('increment')
    id!: number;

    @Column({ type: 'varchar', length: 50, unique: true, nullable: false })
    name!: string;
}
