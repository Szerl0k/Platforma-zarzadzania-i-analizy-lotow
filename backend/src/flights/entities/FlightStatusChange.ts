import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TrackedFlight } from './TrackedFlight';
import { FlightChangeType } from './FlightChangeType';

@Entity('flight_status_changes')
export class FlightStatusChange {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'tracked_flight_id' })
    trackedFlightId!: string;

    @ManyToOne(() => TrackedFlight)
    @JoinColumn({ name: 'tracked_flight_id' })
    trackedFlight!: TrackedFlight;

    @Column({ type: 'int', name: 'change_type_id' })
    changeTypeId!: number;

    @ManyToOne(() => FlightChangeType)
    @JoinColumn({ name: 'change_type_id' })
    changeType!: FlightChangeType;

    @Column({ type: 'jsonb', nullable: true, name: 'old_value' })
    oldValue!: Record<string, any> | null;

    @Column({ type: 'jsonb', nullable: true, name: 'new_value' })
    newValue!: Record<string, any> | null;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({ type: 'timestamp', precision: 0, name: 'occurred_at' })
    occurredAt!: Date;

    @Column({ type: 'boolean', default: false, name: 'notification_sent' })
    notificationSent!: boolean;

    @Column({ type: 'timestamp', precision: 0, name: 'created_at' })
    createdAt!: Date;
}
