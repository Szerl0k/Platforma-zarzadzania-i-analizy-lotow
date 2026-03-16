import 'dotenv/config';
import 'reflect-metadata'
import { DataSource } from 'typeorm';
import {Country} from "./entities/Country";
import {City} from "./entities/City";
import {Airport} from "./entities/Airport";
import {Airline} from "./entities/Airline";
import {FlightStatus} from "./entities/FlightStatus";
import {Flight} from "./entities/Flight";
import {FlightCodeshare} from "./entities/FlightCodeshare";
import {FlightTelemetry} from "./entities/FlightTelemetry";
import {Role} from "./entities/Role";
import {Permission} from "./entities/Permission";
import {RolePermission} from "./entities/RolePermission";
import {User} from "./entities/User";
import {UserPreferences} from "./entities/UserPreferences";
import {FlightHistory} from "./entities/FlightHistory";
import {FavouriteDestination} from "./entities/FavouriteDestination";
import {SimulationStatus} from "./entities/SimulationStatus";
import {CustomFlightSimulation} from "./entities/CustomFlightSimulation";
import {TrackingStatus} from "./entities/TrackingStatus";
import {TrackingSource} from "./entities/TrackingSource";
import {TrackedFlight} from "./entities/TrackedFlight";
import {FlightChangeType} from "./entities/FlightChangeType";
import {FlightStatusChange} from "./entities/FlightStatusChange";

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'flight_db',
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    entities: [
        Country,
        City,
        Airport,
        Airline,
        FlightStatus,
        Flight,
        FlightCodeshare,
        FlightTelemetry,
        Role,
        Permission,
        RolePermission,
        User,
        UserPreferences,
        FlightHistory,
        FavouriteDestination,
        SimulationStatus,
        CustomFlightSimulation,
        TrackingStatus,
        TrackingSource,
        TrackedFlight,
        FlightChangeType,
        FlightStatusChange,
    ],
    migrations: ['src/database/migrations/**/*.ts'],
    subscribers: [],
    // @ts-ignore
    legacySpatialSupport: false
});