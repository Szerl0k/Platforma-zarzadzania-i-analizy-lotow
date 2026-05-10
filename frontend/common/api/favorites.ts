import { apiClient } from "./client";

export interface FavoriteDestination {
  id: string;
  airportIcao: string;
  airportName: string | null;
  airportIata: string | null;
  cityName: string | null;
  countryName: string | null;
  notes: string | null;
  createdAt: string;
}

export interface FavoritesListResponse {
  items: FavoriteDestination[];
  count: number;
}

export async function listFavorites(): Promise<FavoritesListResponse> {
  const { data } = await apiClient.get<FavoritesListResponse>("/favorites");
  return data;
}

export async function addFavorite(payload: {
  airportIcao: string;
  notes?: string | null;
}): Promise<FavoriteDestination> {
  const { data } = await apiClient.post<FavoriteDestination>(
    "/favorites",
    payload,
  );
  return data;
}

export async function removeFavorite(id: string): Promise<void> {
  await apiClient.delete(`/favorites/${encodeURIComponent(id)}`);
}
