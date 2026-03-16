import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tracking_statuses')
export class TrackingStatus {
    @PrimaryGeneratedColumn('increment')
    id!: number;

    @Column({ type: 'varchar', length: 50, unique: true, nullable: false })
    name!: string;
}
