import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Airline } from './Airline';
import { Airport } from './Airport';
import { FlightStatus } from './FlightStatus';
import { FlightCodeshare } from './FlightCodeshare';
import { FlightTelemetry } from './FlightTelemetry';

@Entity('flights')
export class Flight {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', nullable: false, name: 'ident_icao' })
    identIcao!: string;

    @Column({ type: 'varchar', nullable: true, name: 'ident_iata' })
    identIata!: string | null;

    @Column({ type: 'varchar', length: 3, name: 'operating_airline_icao' })
    operatingAirlineIcao!: string;

    @ManyToOne(() => Airline)
    @JoinColumn({ name: 'operating_airline_icao' })
    operatingAirline!: Airline;

    // W OpenSky Network API: pole 'callsign'
    // W AeroAPI: pole 'atc_ident'
    // Jesli AeroAPI zwraca null, to należy tutaj przekazać identIcao
    @Column({ type: 'varchar', nullable: false, name: 'callsign' })
    callsign!: string | null;

    @Column({ type: 'varchar', length: 4, name: 'origin_icao' })
    originIcao!: string;

    @ManyToOne(() => Airport)
    @JoinColumn({ name: 'origin_icao' })
    origin!: Airport;

    @Column({ type: 'varchar', length: 4, name: 'destination_icao' })
    destinationIcao!: string;

    @ManyToOne(() => Airport)
    @JoinColumn({ name: 'destination_icao' })
    destination!: Airport;

    @Column({ type: 'int', name: 'status_id' })
    statusId!: number;

    @ManyToOne(() => FlightStatus)
    @JoinColumn({ name: 'status_id' })
    status!: FlightStatus;

    @Column({ type: 'varchar', length: 10, nullable: true, name: 'terminal_origin' })
    terminalOrigin!: string | null;

    @Column({ type: 'varchar', length: 10, nullable: true, name: 'gate_origin' })
    gateOrigin!: string | null;

    @Column({ type: 'varchar', length: 10, nullable: true, name: 'terminal_destination' })
    terminalDestination!: string | null;

    @Column({ type: 'varchar', length: 10, nullable: true, name: 'gate_destination' })
    gateDestination!: string | null;

    @Column({ type: 'int', nullable: true, name: 'departure_delay' })
    departureDelay!: number | null;

    @Column({ type: 'int', nullable: true, name: 'arrival_delay' })
    arrivalDelay!: number | null;

    @Column({ type: 'timestamptz', nullable: false, name: 'scheduled_out' })
    scheduledOut!: Date;

    @Column({ type: 'timestamptz', nullable: true, name: 'estimated_out' })
    estimatedOut!: Date | null;

    @Column({ type: 'timestamptz', nullable: true, name: 'actual_out' })
    actualOut!: Date | null;

    @Column({ type: 'timestamptz', nullable: false, name: 'scheduled_in' })
    scheduledIn!: Date;

    @Column({ type: 'timestamptz', nullable: true, name: 'estimated_in' })
    estimatedIn!: Date | null;

    @Column({ type: 'timestamptz', nullable: true, name: 'actual_in' })
    actualIn!: Date | null;

    @OneToMany(() => FlightCodeshare, codeshare => codeshare.flight)
    codeshares!: FlightCodeshare[];

    @OneToMany(() => FlightTelemetry, telemetry => telemetry.flight)
    telemetry!: FlightTelemetry[];
}