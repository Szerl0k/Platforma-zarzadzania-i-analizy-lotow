import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { Airport } from './Airport';
import { SimulationStatus } from './SimulationStatus';

@Entity('custom_flight_simulations')
export class CustomFlightSimulation {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'user_id' })
    userId!: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'varchar', length: 200 })
    name!: string;

    @Column({ type: 'varchar', length: 4, name: 'departure_airport_icao' })
    departureAirportIcao!: string;

    @ManyToOne(() => Airport)
    @JoinColumn({ name: 'departure_airport_icao', referencedColumnName: 'icaoCode' })
    departureAirport!: Airport;

    @Column({ type: 'varchar', length: 4, name: 'arrival_airport_icao' })
    arrivalAirportIcao!: string;

    @ManyToOne(() => Airport)
    @JoinColumn({ name: 'arrival_airport_icao', referencedColumnName: 'icaoCode' })
    arrivalAirport!: Airport;

    @Column({ type: 'varchar', length: 10, nullable: true, name: 'aircraft_type' })
    aircraftType!: string | null;

    @Column({ type: 'timestamp', precision: 0, name: 'simulation_start_time' })
    simulationStartTime!: Date;

    @Column({ type: 'int', nullable: true, name: 'estimated_duration' })
    estimatedDuration!: number | null;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'estimated_distance_km' })
    estimatedDistanceKm!: number | null;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'cruise_altitude' })
    cruiseAltitude!: number | null;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'cruise_speed' })
    cruiseSpeed!: number | null;

    @Column({ type: 'jsonb', nullable: true, name: 'route_waypoints' })
    routeWaypoints!: Record<string, any>[] | null;

    @Column({ type: 'decimal', precision: 4, scale: 2, name: 'simulation_speed', default: 1 })
    simulationSpeed!: number;

    @Column({ type: 'int', name: 'status_id' })
    statusId!: number;

    @ManyToOne(() => SimulationStatus)
    @JoinColumn({ name: 'status_id' })
    status!: SimulationStatus;

    @Column({ type: 'varchar', length: 64, nullable: true, unique: true, name: 'share_token' })
    shareToken!: string | null;

    @Column({ type: 'boolean', default: false, name: 'is_public' })
    isPublic!: boolean;

    @Column({ type: 'timestamp', precision: 0, name: 'created_at' })
    createdAt!: Date;

    @Column({ type: 'timestamp', precision: 0, name: 'updated_at' })
    updatedAt!: Date;
}
