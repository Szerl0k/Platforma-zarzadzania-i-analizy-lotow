export interface BoundingBox {
    lamin: number;
    lomin: number;
    lamax: number;
    lomax: number;
}

export interface FlightTimeWindow {
    airportICAO: string;
    begin: number;
    end: number;
}

export interface AircraftTimeWindow {
    icao24: string;
    begin: number;
    end: number;
}

export type StateVectorTuple = [
    string,             // 0: icao24
    string | null,      // 1: callsign
    string,             // 2: origin_country
     number | null,      // 3: time_position
    number,             // 4: last_contact
    number | null,      // 5: longitude
    number | null,      // 6: latitude
    number | null,      // 7: baro_altitude
    boolean,            // 8: on_ground
    number | null,      // 9: velocity
    number | null,      // 10: true_track
    number | null,      // 11: vertical_rate
    number[] | null,    // 12: sensors
    number | null,      // 13: geo_altitude
    string | null,      // 14: squawk
    boolean,            // 15: spi
    number,             // 16: position_source (int 0 to 3)
    number              // 17: category (int 0 to 20)
]

export interface OpenSkyStateVectorsResponse {
    time: number;
    states: StateVectorTuple[] | null;
}

export interface OpenSkyFlight {
    icao24: string,
    firstSeen: number;
    estDepartureAirport: string | null;
    lastSeen: number;
    estArrivalAirport: string | null;
    callsign: string | null;
    estDepartureAirportHorizDistance: number;
    estDepartureAirportVertDistance: number;
    estArrivalAirportHorizDistance: number;
    estArrivalAirportVertDistance: number;
    departureAirportCandidatesCount: number;
    arrivalAirportCandidatesCount: number;
}