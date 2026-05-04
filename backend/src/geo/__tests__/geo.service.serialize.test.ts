import { serializeAirport, serializeAirline } from "../geo.service";
import { Airport } from "../entities/Airport";
import { Airline } from "../entities/Airline";
import { City } from "../entities/City";
import { Country } from "../entities/Country";
import { Point } from "geojson";

function makeCountry(overrides: Partial<Country> = {}): Country {
  return Object.assign(new Country(), {
    isoCode: "PL",
    name: "Poland",
    cities: [],
    ...overrides,
  });
}

function makeCity(overrides: Partial<City> = {}): City {
  return Object.assign(new City(), {
    id: 1,
    name: "Warsaw",
    countryCode: "PL",
    country: makeCountry(),
    airports: [],
    ...overrides,
  });
}

function makeAirport(overrides: Partial<Airport> = {}): Airport {
  return Object.assign(new Airport(), {
    icaoCode: "EPWA",
    iataCode: "WAW",
    name: "Warsaw Chopin",
    cityId: 1,
    city: makeCity(),
    location: { type: "Point", coordinates: [20.967, 52.165] } as Point,
    timezone: "Europe/Warsaw",
    ...overrides,
  });
}

function makeAirline(overrides: Partial<Airline> = {}): Airline {
  return Object.assign(new Airline(), {
    icaoCode: "LOT",
    iataCode: "LO",
    name: "LOT Polish Airlines",
    ...overrides,
  });
}

describe("serializeAirport", () => {
  it("serializes airport with full city and country data", () => {
    const airport = makeAirport();
    expect(serializeAirport(airport)).toEqual({
      icaoCode: "EPWA",
      iataCode: "WAW",
      name: "Warsaw Chopin",
      latitude: 52.165,
      longitude: 20.967,
      timezone: "Europe/Warsaw",
      city: {
        id: 1,
        name: "Warsaw",
        countryCode: "PL",
        countryName: "Poland",
      },
    });
  });

  it("swaps GeoJSON [longitude, latitude] order correctly", () => {
    const airport = makeAirport({
      location: { type: "Point", coordinates: [10.5, 48.3] } as Point,
    });
    const result = serializeAirport(airport);
    expect(result.longitude).toBe(10.5);
    expect(result.latitude).toBe(48.3);
  });

  it("returns null city when airport.city is null", () => {
    const airport = makeAirport({ city: null as unknown as City });
    expect(serializeAirport(airport).city).toBeNull();
  });

  it("returns 0,0 when location is null", () => {
    const airport = makeAirport({ location: null as unknown as Point });
    const result = serializeAirport(airport);
    expect(result.latitude).toBe(0);
    expect(result.longitude).toBe(0);
  });

  it("returns 0,0 when location has no coordinates array", () => {
    const airport = makeAirport({
      location: { type: "Point" } as unknown as Point,
    });
    const result = serializeAirport(airport);
    expect(result.latitude).toBe(0);
    expect(result.longitude).toBe(0);
  });

  it("returns null countryName when city.country is not loaded", () => {
    const city = makeCity({ country: null as unknown as Country });
    const airport = makeAirport({ city });
    expect(serializeAirport(airport).city?.countryName).toBeNull();
  });

  it("preserves null iataCode", () => {
    const airport = makeAirport({ iataCode: null });
    expect(serializeAirport(airport).iataCode).toBeNull();
  });
});

describe("serializeAirline", () => {
  it("serializes airline with all fields", () => {
    const airline = makeAirline();
    expect(serializeAirline(airline)).toEqual({
      icaoCode: "LOT",
      iataCode: "LO",
      name: "LOT Polish Airlines",
    });
  });

  it("serializes airline with null iataCode", () => {
    const airline = makeAirline({ iataCode: null });
    expect(serializeAirline(airline)).toEqual({
      icaoCode: "LOT",
      iataCode: null,
      name: "LOT Polish Airlines",
    });
  });
});
