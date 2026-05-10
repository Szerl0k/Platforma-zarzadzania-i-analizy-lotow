import { z } from "zod";

export const PreviewFlightSchema = z.object({
  ident: z.string().min(1, "Numer lotu jest wymagany."),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data musi być w formacie YYYY-MM-DD.")
    .optional(),
});
export type PreviewFlightDTO = z.infer<typeof PreviewFlightSchema>;

export const ConfirmTrackSchema = z.object({
  flightId: z.string().uuid(),
  source: z.enum(["flight_number", "map_click"]).default("flight_number"),
});
export type ConfirmTrackDTO = z.infer<typeof ConfirmTrackSchema>;

export const HistoryQuerySchema = z.object({
  sort: z.enum(["newest", "oldest", "alpha"]).default("newest"),
  year: z.coerce.number().int().min(1970).max(2200).optional(),
  airlineIcao: z.string().length(3).optional(),
  countryName: z.string().min(1).optional(),
});
export type HistoryQueryDTO = z.infer<typeof HistoryQuerySchema>;

export const NotificationListQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type NotificationListQueryDTO = z.infer<
  typeof NotificationListQuerySchema
>;

export interface TrackedFlightDTO {
  id: string;
  flightId: string;
  ident: string;
  identIata: string | null;
  callsign: string;
  airlineName: string | null;
  origin: { icao: string | null; iata: string | null; city: string | null };
  destination: {
    icao: string | null;
    iata: string | null;
    city: string | null;
  };
  scheduledOut: string | null;
  scheduledIn: string | null;
  estimatedIn: string | null;
  actualOut: string | null;
  actualIn: string | null;
  flightStatus: string | null;
  flightStatusCategory: string | null;
  bucket: "in_air" | "scheduled" | "arriving_soon" | "completed";
  startedTrackingAt: string;
}

export interface FlightHistoryDTO {
  id: string;
  travelDate: string;
  ident: string | null;
  airlineName: string | null;
  originCity: string | null;
  originCountry: string | null;
  destinationCity: string | null;
  destinationCountry: string | null;
  durationMinutes: number | null;
  wasDelayed: boolean | null;
  delayMinutes: number | null;
}

export interface NotificationDTO {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  trackedFlightId: string | null;
  readAt: string | null;
  createdAt: string;
}
