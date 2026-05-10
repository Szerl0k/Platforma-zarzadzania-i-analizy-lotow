import { AppDataSource } from "../common/database/data-source";
import { FavouriteDestination } from "./entities/FavouriteDestination";
import { Airport } from "../geo/entities/Airport";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../common/errors/http-errors";

export interface FavoriteDestinationDTO {
  id: string;
  airportIcao: string;
  airportName: string | null;
  airportIata: string | null;
  cityName: string | null;
  countryName: string | null;
  notes: string | null;
  createdAt: string;
}

function favoriteRepo() {
  return AppDataSource.getRepository(FavouriteDestination);
}

function airportRepo() {
  return AppDataSource.getRepository(Airport);
}

function serialize(fav: FavouriteDestination): FavoriteDestinationDTO {
  return {
    id: fav.id,
    airportIcao: fav.airportIcao,
    airportName: fav.airport?.name ?? null,
    airportIata: fav.airport?.iataCode ?? null,
    cityName: fav.airport?.city?.name ?? null,
    countryName: fav.airport?.city?.country?.name ?? null,
    notes: fav.notes,
    createdAt: fav.createdAt.toISOString(),
  };
}

export async function listFavoritesForUser(
  userId: string,
): Promise<FavoriteDestinationDTO[]> {
  if (!userId) throw new BadRequestError("userId jest wymagany");
  const favorites = await favoriteRepo().find({
    where: { userId },
    relations: ["airport", "airport.city", "airport.city.country"],
    order: { createdAt: "DESC" },
  });
  return favorites.map(serialize);
}

export async function addFavorite(
  userId: string,
  airportIcaoRaw: string,
  notes?: string | null,
): Promise<FavoriteDestinationDTO> {
  if (!userId) throw new BadRequestError("userId jest wymagany");
  const airportIcao = airportIcaoRaw?.trim().toUpperCase();
  if (!airportIcao || airportIcao.length !== 4) {
    throw new BadRequestError("airportIcao musi mieć dokładnie 4 znaki");
  }

  const airport = await airportRepo().findOne({
    where: { icaoCode: airportIcao },
  });
  if (!airport) {
    throw new NotFoundError(`Lotnisko ${airportIcao} nie istnieje w bazie`);
  }

  const existing = await favoriteRepo().findOne({
    where: { userId, airportIcao },
  });
  if (existing) {
    throw new ConflictError("Lotnisko jest już w ulubionych");
  }

  const trimmedNotes = notes?.trim() || null;
  const created = favoriteRepo().create({
    userId,
    airportIcao,
    notes: trimmedNotes,
  });
  await favoriteRepo().save(created);

  const reloaded = await favoriteRepo().findOne({
    where: { id: created.id },
    relations: ["airport", "airport.city", "airport.city.country"],
  });
  return serialize(reloaded!);
}

export async function removeFavorite(
  userId: string,
  id: string,
): Promise<void> {
  if (!userId) throw new BadRequestError("userId jest wymagany");
  if (!id) throw new BadRequestError("id jest wymagane");
  const existing = await favoriteRepo().findOne({ where: { id, userId } });
  if (!existing) {
    throw new NotFoundError("Ulubione nie zostało znalezione");
  }
  await favoriteRepo().delete({ id, userId });
}
