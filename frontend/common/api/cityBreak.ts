import { apiClient } from "./client";

export type SortBy = "flightTime" | "popularity";

export interface CityBreakSearchParams {
  origin: string;
  dateFrom: string;
  dateTo: string;
  maxFlightHours?: number;
  maxDistanceKm?: number;
  excludeCountryCodes?: string[];
  sortBy?: SortBy;
}

export interface CityBreakProposal {
  destinationIcao: string;
  destinationIata: string | null;
  cityName: string | null;
  countryName: string | null;
  countryCode: string | null;
  airportName: string;
  minFlightDurationMinutes: number;
  flightCount: number;
  airlines: string[];
  distanceKm: number | null;
}

export interface CityBreakSearchResponse {
  items: CityBreakProposal[];
  count: number;
}

export interface ProposalFlightOption {
  airlineIcao: string | null;
  airlineIata: string | null;
  airlineName: string | null;
  flightNumber: string | null;
  scheduledDeparture: string | null;
  scheduledArrival: string | null;
  durationMinutes: number | null;
  isDirect: boolean;
  stops: number;
}

export interface ProposalDetails {
  originIcao: string;
  destinationIcao: string;
  options: ProposalFlightOption[];
}

export async function searchCityBreak(
  params: CityBreakSearchParams,
): Promise<CityBreakSearchResponse> {
  const { excludeCountryCodes, ...rest } = params;
  const { data } = await apiClient.get<CityBreakSearchResponse>(
    "/city-break/search",
    {
      params: {
        ...rest,
        excludeCountryCodes: excludeCountryCodes?.join(",") || undefined,
      },
    },
  );
  return data;
}

export async function getProposalDetails(
  destinationIcao: string,
  params: { origin: string; dateFrom: string; dateTo: string },
): Promise<ProposalDetails> {
  const { data } = await apiClient.get<ProposalDetails>(
    `/city-break/proposals/${encodeURIComponent(destinationIcao)}/details`,
    { params },
  );
  return data;
}
