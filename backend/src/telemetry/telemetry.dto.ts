import { z } from "zod";
import { Point } from "geojson";

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

export type LocateFlightQuery = z.infer<typeof LocateFlightQuerySchema>;

export interface LocateFlightResponseDTO {
  icao24: string;
  faFlightId: string;
  internalFlightId: string; // UUID reference to main domain
  location: Point;
  distanceFromOriginKm?: number | null;
  distanceToDestinationKm?: number | null;
  persistedAt: string;
}

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

export type BoundingBoxAreaQuery = z.infer<typeof BoundingBoxAreaQuerySchema>;

export interface MapFlightSummaryDTO {
  icao24: string;
  callsign: string | null;
  location: Point;
  altitude: number | null;
  velocity: number | null;
  heading: number | null;
  onGround: boolean;
}
