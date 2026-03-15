import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Point } from 'geojson';
import { Flight } from './Flight';

@Entity('flight_telemetry')
@Index(['flightId', 'timestamp'])
export class FlightTelemetry {
    @PrimaryGeneratedColumn('increment', { type: 'bigint' })
    id!: string;

    @Column({ type: 'uuid', name: 'flight_id' })
    flightId!: string;

    @ManyToOne(() => Flight, flight => flight.telemetry)
    @JoinColumn({ name: 'flight_id' })
    flight!: Flight;

    @Column({ type: 'timestamptz', nullable: false })
    timestamp!: Date;

    @Column({
        type: 'geometry',
        spatialFeatureType: 'Point',
        srid: 4326,
        nullable: false
    })
    location!: Point;

    @Column({ type: 'int', nullable: true })
    altitude!: number | null;

    @Column({ type: 'decimal', precision: 7, scale: 2, nullable: true })
    velocity!: number | null;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    heading!: number | null;

    @Column({ type: 'boolean', nullable: false, name: 'on_ground' })
    onGround!: boolean;
}