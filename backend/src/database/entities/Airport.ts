import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import {Point} from 'geojson';
import {City} from './City';

@Entity('airports')
export class Airport {

    @PrimaryColumn({type: 'varchar', length: 4, name: 'icao_code'})
    icaoCode!: string;

    @Column({type: 'varchar', length: 3, unique: true, name: 'iata_code', nullable: true})
    iataCode!: string | null;

    @Column({ type: 'varchar', nullable: false})
    name!: string;

    @Column({type: 'int', name: 'city_id'})
    cityId!: number;

    @ManyToOne(() => City, city => city.airports)
    @JoinColumn({name: 'city_id'})
    city!: City;

    @Column({
        type: 'geometry',
        spatialFeatureType: 'Point',
        srid: 4326,
        nullable: false
    })
    location!: Point;

    @Column({ type: 'varchar', nullable: false})
    timezone!: string;
}