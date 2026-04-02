import 'dotenv/config';
import 'reflect-metadata'
import { DataSource } from 'typeorm';
// Geo entities
import {Country} from "../../geo/entities/Country";
import {City} from "../../geo/entities/City";
import {Airport} from "../../geo/entities/Airport";
import {Airline} from "../../geo/entities/Airline";
// Flight entities
import {FlightStatus} from "../../flights/entities/FlightStatus";
import {Flight} from "../../flights/entities/Flight";
import {FlightCodeshare} from "../../flights/entities/FlightCodeshare";
import {FlightTelemetry} from "../../flights/entities/FlightTelemetry";
import {FlightHistory} from "../../flights/entities/FlightHistory";
import {FavouriteDestination} from "../../flights/entities/FavouriteDestination";
import {SimulationStatus} from "../../flights/entities/SimulationStatus";
import {CustomFlightSimulation} from "../../flights/entities/CustomFlightSimulation";
import {TrackingStatus} from "../../flights/entities/TrackingStatus";
import {TrackingSource} from "../../flights/entities/TrackingSource";
import {TrackedFlight} from "../../flights/entities/TrackedFlight";
import {FlightChangeType} from "../../flights/entities/FlightChangeType";
import {FlightStatusChange} from "../../flights/entities/FlightStatusChange";
// User entities
import {Role} from "../../users/entities/Role";
import {Permission} from "../../users/entities/Permission";
import {RolePermission} from "../../users/entities/RolePermission";
import {User} from "../../users/entities/User";
import {UserPreferences} from "../../users/entities/UserPreferences";
import {RefreshToken} from "../../users/entities/RefreshToken";

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
        RefreshToken,
    ],
    migrations: ['src/common/database/migrations/**/*.ts'],
    subscribers: [],
    // @ts-ignore
    legacySpatialSupport: false
});