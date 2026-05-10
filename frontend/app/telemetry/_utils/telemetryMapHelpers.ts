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

  if (!map.hasImage("airplane-icon-sdf")) {
    promises.push(
      map.loadImage("/airplane.png").then((response) => {
        map.addImage("airplane-icon-sdf", response.data, { sdf: true });
      }),
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
 * Obszar limitu dla zapytań mapy (w stopniach kwadratowych).
 * Musi być spójny z limitem na backendzie.
 */
export const MAX_BBOX_AREA = 400;

/**
 * Kwantyzuje bounding box do siatki o określonym rozmiarze oraz ogranicza go
 * do maksymalnej dozwolonej powierzchni, aby uniknąć błędów backendu.
 * Zapewnia, że środek mapy pozostaje punktem centralnym pobieranych danych.
 */
export function calculateQuantizedBBox(
  bounds: LngLatBounds,
  gridSize = 2.0,
  maxArea = MAX_BBOX_AREA,
) {
  const west = bounds.getWest();
  const east = bounds.getEast();
  const south = bounds.getSouth();
  const north = bounds.getNorth();

  const lonRange = east - west;
  const latRange = north - south;
  const currentArea = lonRange * latRange;

  let targetLomin = west;
  let targetLomax = east;
  let targetLamin = south;
  let targetLamax = north;

  // 1. Jeśli obszar przekracza limit, obliczamy mniejszy prostokąt wokół środka
  if (currentArea > maxArea) {
    const scaleFactor = Math.sqrt(maxArea / currentArea);
    const newLonRange = lonRange * scaleFactor;
    const newLatRange = latRange * scaleFactor;
    const center = bounds.getCenter();

    targetLomin = center.lng - newLonRange / 2;
    targetLomax = center.lng + newLonRange / 2;
    targetLamin = center.lat - newLatRange / 2;
    targetLamax = center.lat + newLatRange / 2;

    // Korekta szerokości geograficznej, aby nie wykraczała poza [-90, 90]
    if (targetLamin < -90) {
      targetLamax += -90 - targetLamin;
      targetLamin = -90;
    }
    if (targetLamax > 90) {
      targetLamin -= targetLamax - 90;
      targetLamax = 90;
    }
  }

  // 2. Kwantyzacja do siatki (dla optymalizacji cache na backendzie)
  const quantizeMin = (val: number) => Math.floor(val / gridSize) * gridSize;
  const quantizeMax = (val: number) => Math.ceil(val / gridSize) * gridSize;

  let qLomin = quantizeMin(targetLomin);
  let qLamin = quantizeMin(targetLamin);
  let qLomax = quantizeMax(targetLomax);
  let qLamax = quantizeMax(targetLamax);

  // 3. Po kwantyzacji obszar mógł ponownie przekroczyć limit (np. z 400 do 484)
  // W takim przypadku redukujemy go, usuwając zewnętrzne pasy siatki
  while ((qLamax - qLamin) * (qLomax - qLomin) > maxArea) {
    const qLatRange = qLamax - qLamin;
    const qLonRange = qLomax - qLomin;

    if (qLatRange > qLonRange) {
      qLamin += gridSize;
      if ((qLamax - qLamin) * (qLomax - qLomin) <= maxArea) break;
      qLamax -= gridSize;
    } else {
      qLomin += gridSize;
      if ((qLamax - qLamin) * (qLomax - qLomin) <= maxArea) break;
      qLomax -= gridSize;
    }

    if (qLamin >= qLamax || qLomin >= qLomax) break;
  }

  // 4. Finalna weryfikacja granic fizycznych
  return {
    lomin: qLomin,
    lamin: Math.max(qLamin, -90),
    lomax: qLomax,
    lamax: Math.min(qLamax, 90),
  };
}

/**
 * Konwertuje obiekt bounding box na GeoJSON Polygon,
 * aby umożliwić jego wizualizację na mapie.
 */
export function bboxToGeoJson(bbox: {
  lomin: number;
  lamin: number;
  lomax: number;
  lamax: number;
}): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [bbox.lomin, bbox.lamin],
              [bbox.lomax, bbox.lamin],
              [bbox.lomax, bbox.lamax],
              [bbox.lomin, bbox.lamax],
              [bbox.lomin, bbox.lamin],
            ],
          ],
        },
        properties: {},
      },
    ],
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
  trackedCallsigns: Set<string> = new Set(),
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
      .map((f) => {
        const callsign = f.callsign?.trim() || f.icao24;
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [
              f.location!.coordinates[0],
              f.location!.coordinates[1],
            ],
          },
          properties: {
            icao24: f.icao24,
            callsign,
            altitude: f.altitude,
            velocity: f.velocity,
            heading: f.heading,
            onGround: f.onGround,
            tracked: trackedCallsigns.has(callsign),
          },
        };
      }),
  };
}
