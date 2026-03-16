import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { Airport } from './Airport';

@Entity('favorite_destinations')
export class FavouriteDestination {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'user_id' })
    userId!: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'varchar', length: 4, name: 'airport_icao' })
    airportIcao!: string;

    @ManyToOne(() => Airport)
    @JoinColumn({ name: 'airport_icao', referencedColumnName: 'icaoCode' })
    airport!: Airport;

    @Column({ type: 'text', nullable: true })
    notes!: string | null;

    @Column({ type: 'timestamp', precision: 0, name: 'created_at' })
    createdAt!: Date;

    @Column({ type: 'timestamp', precision: 0, name: 'updated_at' })
    updatedAt!: Date;
}
