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

export interface AeroAPIFlightsBetweenParams extends AeroAPIQueryParams {
    type?: 'Airline';
    connection?: 'nonstop' | 'onestop';
}

export interface AeroAPISchedulesParams extends AeroAPIQueryParams {
    origin?: string;
    destination?: string;
    airline?: string;
    flight_number?: string;
}

export interface AeroAPIAirportRef {
    code: string;
    code_icao: string | null;
    code_iata: string | null;
    code_lid: string | null;
    timezone: string | null;
    name: string | null;
    city: string | null;
    airport_info_url: string | null;
}
export interface AeroAPIFlightDetails {
    ident: string;
    ident_icao: string | null;
    ident_iata: string | null;
    fa_flight_id: string;
    operator: string | null;
    operator_icao: string | null;
    operator_iata: string | null;
    flight_number: string | null;
    registration: string | null;
    atc_ident: string | null;
    inbound_fa_flight_id: string | null;
    codeshares: string[] | null;
    codeshares_iata: string[] | null;
    blocked: boolean;
    diverted: boolean;
    cancelled: boolean;
    position_only: boolean;
    origin: AeroAPIAirportRef | null;
    destination: AeroAPIAirportRef | null;
    departure_delay: number | null;
    arrival_delay: number | null;
    filed_ete: number | null;
    progress_percent: number | null;
    status: string;
    aircraft_type: string | null;
    route_distance: number | null;
    filed_airspeed: number | null;
    filed_altitude: number | null;
    route: string | null;
    baggage_claim: string | null;
    seats_cabin_business: number | null;
    seats_cabin_coach: number | null;
    seats_cabin_first: number | null;
    gate_origin: string | null;
    gate_destination: string | null;
    terminal_origin: string | null;
    terminal_destination: string | null;
    type: string;
    scheduled_out: string | null;
    estimated_out: string | null;
    actual_out: string | null;
    scheduled_off: string | null;
    estimated_off: string | null;
    actual_off: string | null;
    scheduled_on: string | null;
    estimated_on: string | null;
    actual_on: string | null;
    scheduled_in: string | null;
    estimated_in: string | null;
    actual_in: string | null;
}

export interface AeroAPILocation {
    code: string;
    code_icao?: string | null;
    code_iata?: string | null;
    timezone?: string | null;
    name?: string | null;
    city?: string | null;
    airport_info_url?: string | null;
}

export interface AeroAPIAirportInfo {
    airport_code: string;
    alternate_ident?: string | null;
    name: string;
    elevation?: number | null;
    city: string;
    state?: string | null;
    longitude: number;
    latitude: number;
    timezone: string;
    country_code: string;
    wiki_url?: string | null;
}

export interface AeroAPISchedule {
    ident: string;
    ident_icao?: string | null;
    ident_iata?: string | null;
    fa_flight_id?: string | null;
    operator?: string | null;
    operator_icao?: string | null;
    operator_iata?: string | null;
    flight_number?: string | null;
    origin?: AeroAPILocation | null;
    destination?: AeroAPILocation | null;
    scheduled_out: string;
    scheduled_in: string;
    aircraft_type?: string | null;
    route_distance?: number | null;
    seats_cabin_business?: number | null;
    seats_cabin_coach?: number | null;
    seats_cabin_first?: number | null;
}

export interface AeroAPIPaginatedResponse {
    links?: {
        next?: string | null;
    };
    num_pages?: number;
}

export interface AeroAPIStandardFlightsResponse extends AeroAPIPaginatedResponse {
    flights: AeroAPIFlightDetails[];
}

export interface AeroAPISegmentedFlight {
    segments: AeroAPIFlightDetails[];
}

export interface AeroAPISegmentedFlightsResponse extends AeroAPIPaginatedResponse {
    flights: AeroAPISegmentedFlight[];
}

export interface AeroAPISchedulesResponse extends AeroAPIPaginatedResponse {
    schedules: AeroAPISchedule[];
}