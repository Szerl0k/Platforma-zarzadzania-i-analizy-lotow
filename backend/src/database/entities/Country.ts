import {Entity, PrimaryColumn, Column, OneToMany} from 'typeorm';
import {City} from './City'


@Entity('countries')
export class Country {
    @PrimaryColumn({ type: 'varchar', length: 2, name: 'iso_code'})
    isoCode!: string;

    @Column({ type: 'varchar', nullable: false})
    name!: string;

    @OneToMany( () => City, city => city.country)
    cities!: City[];
}