import { Flight } from "../../flights/entities/Flight";
import { FlightStatus } from "../../flights/entities/FlightStatus";
import { Airport } from "../../geo/entities/Airport";
import { Airline } from "../../geo/entities/Airline";
import { City } from "../../geo/entities/City";
import { Country } from "../../geo/entities/Country";
import { User } from "../../users/entities/User";
import { TrackedFlight } from "../entities/TrackedFlight";
import { TrackingStatus } from "../entities/TrackingStatus";
import { TrackingSource } from "../entities/TrackingSource";
import { FlightHistory } from "../entities/FlightHistory";
import { NotificationLog } from "../entities/NotificationLog";

export function makeFlightStatus(
  overrides: Partial<FlightStatus> = {},
): FlightStatus {
  return {
    id: 1,
    name: "Scheduled",
    category: "scheduled",
    ...overrides,
  } as FlightStatus;
}

export function makeFlight(overrides: Partial<Flight> = {}): Flight {
  return {
    id: "flight-1",
    identIcao: "LOT123",
    identIata: "LO123",
    callsign: "LOT123",
    statusId: 1,
    status: makeFlightStatus(),
    gateOrigin: "A1",
    gateDestination: "B2",
    departureDelay: 0,
    arrivalDelay: 0,
    scheduledOut: new Date("2026-05-10T08:00:00Z"),
    estimatedOut: new Date("2026-05-10T08:00:00Z"),
    actualOut: null,
    scheduledIn: new Date("2026-05-10T10:00:00Z"),
    estimatedIn: new Date("2026-05-10T10:00:00Z"),
    actualIn: null,
    origin: null,
    destination: null,
    operatingAirline: null,
    codeshares: [],
    createdAt: new Date("2026-05-10T00:00:00Z"),
    updatedAt: new Date("2026-05-10T00:00:00Z"),
    ...overrides,
  } as unknown as Flight;
}

export function makeTrackingStatus(
  overrides: Partial<TrackingStatus> = {},
): TrackingStatus {
  return {
    id: 1,
    name: "active",
    description: "Active",
    ...overrides,
  } as TrackingStatus;
}

export function makeTrackingSource(
  overrides: Partial<TrackingSource> = {},
): TrackingSource {
  return {
    id: 1,
    name: "flight_number",
    description: "From flight number search",
    ...overrides,
  } as TrackingSource;
}

export function makeTrackedFlight(
  overrides: Partial<TrackedFlight> = {},
): TrackedFlight {
  return {
    id: "tracked-1",
    userId: "user-1",
    flightId: "flight-1",
    flight: makeFlight(),
    trackingStatusId: 1,
    trackingStatus: makeTrackingStatus(),
    sourceId: 1,
    source: makeTrackingSource(),
    startedTrackingAt: new Date("2026-05-10T00:00:00Z"),
    stoppedTrackingAt: null,
    lastNotifiedAt: null,
    createdAt: new Date("2026-05-10T00:00:00Z"),
    updatedAt: new Date("2026-05-10T00:00:00Z"),
    ...overrides,
  } as TrackedFlight;
}

export function makeFlightHistory(
  overrides: Partial<FlightHistory> = {},
): FlightHistory {
  return {
    id: "hist-1",
    userId: "user-1",
    flightId: "flight-1",
    flight: makeFlight(),
    travelDate: "2026-05-10",
    seatNumber: null,
    bookingReference: null,
    cabinClass: null,
    notes: null,
    wasDelayed: false,
    delayMinutes: 0,
    userRating: null,
    createdAt: new Date("2026-05-10T00:00:00Z"),
    updatedAt: new Date("2026-05-10T00:00:00Z"),
    ...overrides,
  } as FlightHistory;
}

export function makeNotificationLog(
  overrides: Partial<NotificationLog> = {},
): NotificationLog {
  return {
    id: "notif-1",
    userId: "user-1",
    trackedFlightId: "tracked-1",
    flightStatusChangeId: null,
    type: "delay",
    title: "Lot LOT123 — opóźnienie",
    body: "Opóźnienie wylotu wzrosło do 25 min.",
    link: "http://localhost:3000/telemetry?flightId=flight-1",
    readAt: null,
    createdAt: new Date("2026-05-10T08:00:00Z"),
    updatedAt: new Date("2026-05-10T08:00:00Z"),
    ...overrides,
  } as NotificationLog;
}

export function makeCountry(overrides: Partial<Country> = {}): Country {
  return {
    isoCode: "PL",
    name: "Poland",
    cities: [],
    ...overrides,
  } as Country;
}

export function makeCity(overrides: Partial<City> = {}): City {
  return {
    id: 1,
    countryCode: "PL",
    country: makeCountry(),
    name: "Warsaw",
    airports: [],
    ...overrides,
  } as City;
}

export function makeAirportWithLocation(
  overrides: Partial<Airport> & { lat?: number; lon?: number } = {},
): Airport {
  const lat = overrides.lat ?? 52.16;
  const lon = overrides.lon ?? 21.0;
  const { lat: _lat, lon: _lon, ...rest } = overrides;
  void _lat;
  void _lon;
  return {
    icaoCode: "EPWA",
    iataCode: "WAW",
    name: "Warsaw Chopin",
    cityId: 1,
    city: makeCity(),
    location: { type: "Point", coordinates: [lon, lat] },
    timezone: "Europe/Warsaw",
    ...rest,
  } as Airport;
}

export function makeAirline(overrides: Partial<Airline> = {}): Airline {
  return {
    icaoCode: "LOT",
    iataCode: "LO",
    name: "LOT Polish Airlines",
    ...overrides,
  } as Airline;
}

export function makeUserWithPublicProfile(
  overrides: Partial<User> = {},
): User {
  return {
    id: "user-1",
    email: "user@example.com",
    passwordHash: "hash",
    nickname: "globetrotter",
    emailVerified: true,
    verificationToken: null,
    verificationTokenExpires: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    profilePublic: true,
    lastLogin: null,
    roleId: 1,
    ...overrides,
  } as User;
}

export function makeTrackingRepoMock() {
  return {
    findActiveByUserAndFlight: jest.fn(),
    findActiveById: jest.fn(),
    listActiveByUser: jest.fn(),
    countActiveByUser: jest.fn(),
    listAllActive: jest.fn(),
    create: jest.fn(),
    markStopped: jest.fn(),
    updateLastNotifiedAt: jest.fn(),
    findStatusByName: jest.fn(),
    findSourceByName: jest.fn(),
    createHistory: jest.fn(),
    findHistoryByUserAndFlight: jest.fn(),
    listHistoryByUser: jest.fn(),
    deleteHistoryById: jest.fn(),
    insertNotification: jest.fn(),
    listNotifications: jest.fn(),
    countUnread: jest.fn(),
    markNotificationRead: jest.fn(),
    markAllNotificationsRead: jest.fn(),
  };
}
