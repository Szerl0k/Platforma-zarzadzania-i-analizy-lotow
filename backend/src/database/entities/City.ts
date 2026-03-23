import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, Index, Unique} from 'typeorm';
import {Country} from './Country'
import {Airport} from './Airport'

@Entity('cities')
@Unique('UQ_country_city', ['countryCode', 'name'])
export class City {

    @PrimaryGeneratedColumn('increment')
    id!: number;

    @Index()
    @Column({ type: 'varchar', length: 2, name: 'country_code'})
    countryCode!: string;

    @ManyToOne( () => Country, country => country.cities)
    @JoinColumn({name: 'country_code'})
    country!: Country;

    @OneToMany(() => Airport, airport => airport.city)
    airports!: Airport[];

    @Column({ type: 'varchar', nullable: false})
    name!: string;
}