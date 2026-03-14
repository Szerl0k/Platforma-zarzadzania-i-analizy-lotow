export interface AeroAPIQueryParams {
    start?: string;  // Format ISO 8601 (np. 2026-02-15T00:00:00Z)
    end?: string;
    max_pages?: number;
    cursor?: string
}

export interface AeroAPIAirportFlightParams extends AeroAPIQueryParams {
    type?: 'Airline';
    airline?: string;
}

export interface AeroAPIFlight {
    ident: string;
    ident_icao: string;
    ident_iata: string;
    actual_ident?: string;
    actual_ident_icao?: string;
    actual_ident_iata?: string;
    fa_flight_id: string;
    operator?: string;
    operator_icao?: string;
    operator_iata?: string;
    flight_number?: string;
    registration?: string;
    origin?: AeroAPILocation;
    destination?: AeroAPILocation;
    departure_delay?: number;
    arrival_delay?: number;
    scheduled_out?: string;
    estimated_out?: string;
    actual_out?: string;
    scheduled_off?: string;
    estimated_off?: string;
    actual_off?: string;
    scheduled_on?: string;
    estimated_on?: string;
    actual_on?: string;
    scheduled_in?: string;
    estimated_in?: string;
    actual_in?: string;
    progress_percent?: number;
    status: string;
    aircraft_type?: string;
    route_distance?: number;
    gate_origin?: string;
    gate_destination?: string;
    terminal_origin?: string;
    terminal_destination?: string;
    type: string;
}

export interface AeroAPILocation {
    code: string;
    code_icao?: string;
    code_iata?: string;
    timezone?: string;
    name?: string;
    city?: string;
    airport_info_url?: string;
}

export interface AeroAPIAirportInfo {
    airport_code: string;
    alternate_ident?: string;
    name: string;
    elevation?: number;
    city: string;
    state?: string;
    longitude: number;
    latitude: number;
    timezone: string;
    country_code: string;
    wiki_url?: string;
}

export interface AeroAPIRoute {
    route: string;
    count: number;
    filed_altitude_min: number;
    filed_altitude_max: number;
    last_departure_time: string;
}

export interface AeroAPIPaginatedResponse {
    links?: {
        next?: string;
    };
    num_pages?: number;
}

export interface AeroAPIFlightsResponse extends AeroAPIPaginatedResponse {
    flights: AeroAPIFlight[];
}

export interface AeroAPIRoutesResponse extends AeroAPIPaginatedResponse {
    routes: AeroAPIRoute[];
}