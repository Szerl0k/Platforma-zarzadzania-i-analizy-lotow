import { apiClient } from "./client";

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

export interface FlightDetailsDTO {
  id: string;
  ident: string | null;
  identIcao?: string | null;
  identIata?: string | null;
  callsign?: string | null;
  scheduledOut: string | null;
  estimatedOut: string | null;
  actualOut: string | null;
  scheduledIn: string | null;
  estimatedIn: string | null;
  actualIn: string | null;
  origin?: { icaoCode: string | null; city: string | null };
  destination?: { icaoCode: string | null; city: string | null };
  operatingAirline?: { name: string | null } | null;
  flightStatus?: string | null;
}

export interface HistoryFilters {
  sort?: "newest" | "oldest" | "alpha";
  year?: number;
  airlineIcao?: string;
  countryName?: string;
}

export async function previewTracking(
  ident: string,
  date?: string,
): Promise<FlightDetailsDTO> {
  const { data } = await apiClient.post<FlightDetailsDTO>("/tracking/preview", {
    ident,
    ...(date ? { date } : {}),
  });
  return data;
}

export async function confirmTracking(
  flightId: string,
  source: "flight_number" | "map_click" = "flight_number",
): Promise<TrackedFlightDTO> {
  const { data } = await apiClient.post<TrackedFlightDTO>("/tracking", {
    flightId,
    source,
  });
  return data;
}

export async function listMyTrackedFlights(): Promise<TrackedFlightDTO[]> {
  const { data } = await apiClient.get<TrackedFlightDTO[]>("/tracking/me");
  return data;
}

export async function getTrackedCount(): Promise<number> {
  const { data } = await apiClient.get<{ count: number }>("/tracking/me/count");
  return data.count;
}

export async function untrackFlight(id: string): Promise<void> {
  await apiClient.delete(`/tracking/${encodeURIComponent(id)}`);
}

export async function listFlightHistory(
  filters: HistoryFilters = {},
): Promise<FlightHistoryDTO[]> {
  const { data } = await apiClient.get<FlightHistoryDTO[]>("/tracking/history", {
    params: filters,
  });
  return data;
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  await apiClient.delete(`/tracking/history/${encodeURIComponent(id)}`);
}

export async function exportHistoryCsvUrl(): Promise<string> {
  const { data } = await apiClient.get<string>("/tracking/history/export", {
    responseType: "text",
    transformResponse: [(x) => x],
  });
  return data;
}

export async function listNotifications(opts: {
  unreadOnly?: boolean;
  limit?: number;
} = {}): Promise<NotificationDTO[]> {
  const { data } = await apiClient.get<NotificationDTO[]>("/notifications", {
    params: {
      ...(opts.unreadOnly ? { unreadOnly: "true" } : {}),
      ...(opts.limit ? { limit: opts.limit } : {}),
    },
  });
  return data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<{ count: number }>(
    "/notifications/unread-count",
  );
  return data.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.post(`/notifications/${encodeURIComponent(id)}/read`);
}

export async function markAllNotificationsRead(): Promise<number> {
  const { data } = await apiClient.post<{ updated: number }>(
    "/notifications/read-all",
  );
  return data.updated;
}
