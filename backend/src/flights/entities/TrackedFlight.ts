import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from '../../users/entities/User';
import { Flight } from './Flight';
import { TrackingStatus } from './TrackingStatus';
import { TrackingSource } from './TrackingSource';

@Entity('tracked_flights')
@Unique(['userId', 'flightId', 'startedTrackingAt'])
export class TrackedFlight {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'user_id' })
    userId!: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'uuid', name: 'flight_id' })
    flightId!: string;

    @ManyToOne(() => Flight)
    @JoinColumn({ name: 'flight_id' })
    flight!: Flight;

    @Column({ type: 'int', name: 'tracking_status_id' })
    trackingStatusId!: number;

    @ManyToOne(() => TrackingStatus)
    @JoinColumn({ name: 'tracking_status_id' })
    trackingStatus!: TrackingStatus;

    @Column({ type: 'int', name: 'source_id' })
    sourceId!: number;

    @ManyToOne(() => TrackingSource)
    @JoinColumn({ name: 'source_id' })
    source!: TrackingSource;

    @Column({ type: 'timestamp', precision: 0, name: 'started_tracking_at' })
    startedTrackingAt!: Date;

    @Column({ type: 'timestamp', precision: 0, nullable: true, name: 'stopped_tracking_at' })
    stoppedTrackingAt!: Date | null;

    @Column({ type: 'timestamp', precision: 0, name: 'created_at' })
    createdAt!: Date;
}
