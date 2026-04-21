import type { ExpressionSpecification, Map as MaplibreMap } from "maplibre-gl";
import { FlightPositionDTO } from "@/common/api/telemetry";
import type { Airport } from '@/common/api/airports';

export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

export async function tintMapImage(map: MaplibreMap, name: string, imagePath: string, color: string): Promise<void> {
    const response = await map.loadImage(imagePath);
    const img = response.data as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
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

function greatCircleCoords(lon1: number, lat1: number, lon2: number, lat2: number, steps = 64): number[][] {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const toDeg = (r: number) => (r * 180) / Math.PI;

    const lat1R = toRad(lat1), lon1R = toRad(lon1);
    const lat2R = toRad(lat2), lon2R = toRad(lon2);

    const x1 = Math.cos(lat1R) * Math.cos(lon1R);
    const y1 = Math.cos(lat1R) * Math.sin(lon1R);
    const z1 = Math.sin(lat1R);

    const x2 = Math.cos(lat2R) * Math.cos(lon2R);
    const y2 = Math.cos(lat2R) * Math.sin(lon2R);
    const z2 = Math.sin(lat2R);

    const dot = Math.max(-1, Math.min(1, x1 * x2 + y1 * y2 + z1 * z2));
    const d = Math.acos(dot);

    if (d < 1e-10) return [[lon1, lat1], [lon2, lat2]];

    const sinD = Math.sin(d);
    return Array.from({ length: steps + 1 }, (_, i) => {
        const t = i / steps;
        const A = Math.sin((1 - t) * d) / sinD;
        const B = Math.sin(t * d) / sinD;
        const x = A * x1 + B * x2;
        const y = A * y1 + B * y2;
        const z = A * z1 + B * z2;
        return [toDeg(Math.atan2(y, x)), toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)))];
    });
}

export function getPositionAlongPath(coords: number[][], t: number): [number, number] {
    if (coords.length < 2) return [coords[0][0], coords[0][1]];
    const idx = Math.max(0, Math.min(t, 1)) * (coords.length - 1);
    const i = Math.min(Math.floor(idx), coords.length - 2);
    const frac = idx - i;
    return [
        coords[i][0] + frac * (coords[i + 1][0] - coords[i][0]),
        coords[i][1] + frac * (coords[i + 1][1] - coords[i][1]),
    ];
}

export function getBearingAlongPath(coords: number[][], t: number): number {
    const from = getPositionAlongPath(coords, t);
    const next = getPositionAlongPath(coords, Math.min(t + 0.005, 1));
    const toRad = (d: number) => (d * Math.PI) / 180;
    const [lon1, lat1] = from.map(toRad);
    const [lon2, lat2] = next.map(toRad);
    const dLon = lon2 - lon1;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

export function mapRoutesToGeoJson(origin: Airport, destinations: Airport[]): GeoJSON.FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: destinations
            .filter((d) => d.latitude !== 0 || d.longitude !== 0)
            .map((dest) => ({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: greatCircleCoords(
                        origin.longitude, origin.latitude,
                        dest.longitude, dest.latitude,
                    ),
                },
                properties: {
                    destinationIcao: dest.icaoCode,
                    destinationName: dest.name,
                },
            })),
    };
}

export function mapAirportsToGeoJson(airports: Airport[]): GeoJSON.FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: airports.map((a) => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
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
