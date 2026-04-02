import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique, Index} from 'typeorm';
import { Flight } from './Flight';
import { Airline } from '../../geo/entities/Airline';

@Entity('flight_codeshares')
@Unique(['flightId', 'marketingIdentIata'])
export class FlightCodeshare {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'flight_id' })
    flightId!: string;

    @ManyToOne(() => Flight, flight => flight.codeshares)
    @JoinColumn({ name: 'flight_id' })
    flight!: Flight;

    @Index()
    @Column({ type: 'varchar', length: 3, nullable: true, name: 'marketing_airline_icao' })
    marketingAirlineIcao!: string | null;

    @ManyToOne(() => Airline)
    @JoinColumn({ name: 'marketing_airline_icao' })
    marketingAirline!: Airline;

    @Column({ type: 'varchar', nullable: false, name: 'marketing_ident_iata' })
    marketingIdentIata!: string;

    @Column({ type: 'varchar', nullable: true, name: 'marketing_ident_icao' })
    marketingIdentIcao!: string | null;
}