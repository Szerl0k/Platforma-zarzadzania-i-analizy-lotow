import type { ExpressionSpecification, Map as MaplibreMap } from "maplibre-gl";
import { FlightPositionDTO } from "@/common/api/telemetry";
import type { Airport } from "@/common/api/airports";
import { LngLatBounds } from "maplibre-gl";
import { greatCircleCoords } from "@/common/utils/geoUtils";

export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

export const EMPTY_GEOJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export interface AirportFeatureProperties {
  icaoCode: string;
  iataCode: string | null;
  name: string;
  cityName: string | null;
  countryName: string | null;
  timezone: string;
}

export interface FlightFeatureProperties {
  icao24: string;
  callsign?: string;
  altitude?: number | null;
  velocity?: number | null;
  heading?: number | null;
  onGround?: boolean;
}

export async function tintMapImage(
  map: MaplibreMap,
  name: string,
  imagePath: string,
  color: string,
): Promise<void> {
  const response = await map.loadImage(imagePath);
  const img = response.data as HTMLImageElement;
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  map.addImage(name, ctx.getImageData(0, 0, canvas.width, canvas.height));
}

export const POLISH_TEXT_FIELD: ExpressionSpecification = [
  "coalesce",
  ["get", "name:pl"],
  ["get", "name:latin"],
  ["get", "name"],
];

/**
 * Aplikuje polskie nazwy dla wszystkich warstw tekstowych na mapie.
 */
export function applyPolishLabels(map: MaplibreMap) {
  const layers = map.getStyle().layers ?? [];
  for (const layer of layers) {
    if (layer.type !== "symbol") continue;
    const current = map.getLayoutProperty(layer.id, "text-field");
    if (current == null) continue;
    map.setLayoutProperty(layer.id, "text-field", POLISH_TEXT_FIELD);
  }
}

/**
 * Ładuje i koloruje ikony wymagane przez widok mapy telemetrycznej.
 */
export async function loadTelemetryMapImages(map: MaplibreMap) {
  const promises = [];

  if (!map.hasImage("airplane-icon")) {
    promises.push(
      map.loadImage("/airplane.png").then((response) => {
        map.addImage("airplane-icon", response.data);
      }),
    );
  }

  if (!map.hasImage("airplane-icon-navy")) {
    promises.push(
      tintMapImage(map, "airplane-icon-navy", "/airplane.png", "#1E3A8A"),
    );
  }

  if (!map.hasImage("airport-icon")) {
    promises.push(tintMapImage(map, "airport-icon", "/airport.png", "#1E3A8A"));
  }

  if (!map.hasImage("airport-icon-lime")) {
    promises.push(
      tintMapImage(map, "airport-icon-lime", "/airport.png", "#BEF264"),
    );
  }

  return Promise.all(promises);
}

/**
 * Kwantyzuje bounding box do siatki o określonym rozmiarze,
 * aby zoptymalizować cache'owanie zapytań na backendzie.
 */
export function calculateQuantizedBBox(bounds: LngLatBounds, gridSize = 2.0) {
  const quantizeMin = (val: number) => Math.floor(val / gridSize) * gridSize;
  const quantizeMax = (val: number) => Math.ceil(val / gridSize) * gridSize;

  return {
    lomin: quantizeMin(bounds.getWest()),
    lamin: quantizeMin(bounds.getSouth()),
    lomax: quantizeMax(bounds.getEast()),
    lamax: quantizeMax(bounds.getNorth()),
  };
}

export function mapRoutesToGeoJson(
  origin: Airport,
  destinations: Airport[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: destinations
      .filter((d) => d.latitude !== 0 || d.longitude !== 0)
      .map((dest) => ({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: greatCircleCoords(
            origin.longitude,
            origin.latitude,
            dest.longitude,
            dest.latitude,
          ),
        },
        properties: {
          destinationIcao: dest.icaoCode,
          destinationName: dest.name,
        },
      })),
  };
}

export function mapAirportsToGeoJson(
  airports: Airport[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: airports.map((a) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [a.longitude, a.latitude],
      },
      properties: {
        icaoCode: a.icaoCode,
        iataCode: a.iataCode,
        name: a.name,
        cityName: a.city?.name ?? null,
        countryName: a.city?.countryName ?? null,
        timezone: a.timezone,
      },
    })),
  };
}

export function mapFlightsToGeoJson(
  flights: FlightPositionDTO[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: flights
      .filter(
        (f) =>
          f.location?.coordinates &&
          typeof f.location.coordinates[0] === "number" &&
          typeof f.location.coordinates[1] === "number",
      )
      .map((f) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [f.location!.coordinates[0], f.location!.coordinates[1]],
        },
        properties: {
          icao24: f.icao24,
          callsign: f.callsign?.trim() || f.icao24,
          altitude: f.altitude,
          velocity: f.velocity,
          heading: f.heading,
          onGround: f.onGround,
        },
      })),
  };
}
