import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

@Entity('flight_history')
export class FlightHistory {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'user_id' })
    userId!: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'date', name: 'travel_date' })
    travelDate!: string;

    @Column({ type: 'varchar', length: 10, nullable: true, name: 'seat_number' })
    seatNumber!: string | null;

    @Column({ type: 'varchar', length: 20, nullable: true, name: 'booking_reference' })
    bookingReference!: string | null;

    // 1=Economy, 2=Premium Economy, 3=Business, 4=First
    @Column({ type: 'int', nullable: true, name: 'cabin_class' })
    cabinClass!: number | null;

    @Column({ type: 'text', nullable: true })
    notes!: string | null;

    @Column({ type: 'boolean', nullable: true, name: 'was_delayed' })
    wasDelayed!: boolean | null;

    @Column({ type: 'int', nullable: true, name: 'delay_minutes' })
    delayMinutes!: number | null;

    @Column({ type: 'decimal', precision: 2, scale: 1, nullable: true, name: 'user_rating' })
    userRating!: number | null;

    @Column({ type: 'timestamp', precision: 0, name: 'created_at' })
    createdAt!: Date;

    @Column({ type: 'timestamp', precision: 0, name: 'updated_at' })
    updatedAt!: Date;
}
