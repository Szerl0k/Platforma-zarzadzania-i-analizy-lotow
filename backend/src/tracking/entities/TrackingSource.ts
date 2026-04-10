import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tracking_sources')
export class TrackingSource {
    @PrimaryGeneratedColumn('increment')
    id!: number;

    @Column({ type: 'varchar', length: 50, unique: true, nullable: false })
    name!: string;
}
