import { z } from "zod";
import { Point } from "geojson";

/**
 * Schema for locating a flight using ICAO24 or AeroAPI flight ID.
 * Requires at least one of the identifiers to be present.
 */
export const LocateFlightQuerySchema = z
  .object({
    faFlightId: z.string().optional(),
    icao24: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.faFlightId && !data.icao24) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Należy podać faFlightId lub icao24.",
        path: ["faFlightId"],
      });
    }
  });

/**
 * Type inferred from LocateFlightQuerySchema.
 */
export type LocateFlightQuery = z.infer<typeof LocateFlightQuerySchema>;

/**
 * Data Transfer Object for flight location response.
 */
export interface LocateFlightResponseDTO {
  /** 24-bit ICAO aircraft address in hex. */
  icao24: string;
  /** AeroAPI unique flight identifier. */
  faFlightId: string;
  /** Internal system UUID for the flight. */
  internalFlightId: string; // UUID reference to main domain
  /** Current geospatial location. */
  location: Point;
  /** Distance from origin airport in kilometers. */
  distanceFromOriginKm?: number | null;
  /** Distance to destination airport in kilometers. */
  distanceToDestinationKm?: number | null;
  /** ISO timestamp when this state was persisted. */
  persistedAt: string;
}

/**
 * Schema for querying flights within a specific geographic bounding box.
 */
export const BoundingBoxAreaQuerySchema = z
  .object({
    lamin: z.coerce.number().min(-90).max(90),
    lamax: z.coerce.number().min(-90).max(90),
    lomin: z.coerce.number().min(-180).max(180),
    lomax: z.coerce.number().min(-180).max(180),
  })
  .superRefine((data, ctx) => {
    if (data.lamin >= data.lamax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Parametr 'lamin' musi być mniejszy niż 'lamax'",
        path: ["lamin"],
      });
    }

    if (data.lomin > data.lomax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Parametr 'lomin' musi być mniejszy niż 'lomax'",
        path: ["lomin"],
      });
    }
  });

/**
 * Type inferred from BoundingBoxAreaQuerySchema.
 */
export type BoundingBoxAreaQuery = z.infer<typeof BoundingBoxAreaQuerySchema>;

/**
 * Summary DTO for displaying a flight on the map.
 */
export interface MapFlightSummaryDTO {
  /** 24-bit ICAO aircraft address in hex. */
  icao24: string;
  /** Aircraft call sign (ATC). */
  callsign: string | null;
  /** Current geospatial location. */
  location: Point;
  /** Barometric altitude in meters. */
  altitude: number | null;
  /** Ground speed in meters per second. */
  velocity: number | null;
  /** Magnetic heading in degrees. */
  heading: number | null;
  /** Indicates if the aircraft is on the ground. */
  onGround: boolean;
}
