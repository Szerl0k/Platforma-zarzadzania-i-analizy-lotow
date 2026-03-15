import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import {Country} from './Country'
import {Airport} from './Airport'

@Entity('cities')
export class City {

    @PrimaryGeneratedColumn('increment')
    id!: number;

    @Column({ type: 'varchar', length: 2, name: 'country_code'})
    countryCode!: string;

    @ManyToOne( () => Country, country => country.cities)
    @JoinColumn({name: 'country_code'})
    country!: Country;

    @OneToMany(() => Airport, airport => airport.city)
    airports!: Airport[];
}