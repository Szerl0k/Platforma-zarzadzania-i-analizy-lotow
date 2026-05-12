import { ILike } from "typeorm";
import {
  airlineRepo,
  normalizeIcao,
  hasDbCode,
  NotFoundError,
  BadRequestError,
  UpstreamError,
  AirlineCreateInput,
  AirlineUpdateInput,
} from "./geo.utils";
import { Airline } from "./entities/Airline";
import {
  getAeroApiClient,
  AeroAPIError,
  AeroAPIOperatorInfo,
} from "../common/integrations/aeroapi";

export async function findAirlineInDb(code: string): Promise<Airline | null> {
  const normalized = normalizeIcao(code);
  return airlineRepo().findOne({
    where: [{ icaoCode: normalized }, { iataCode: normalized }],
  });
}

async function fetchOperatorFromAeroApi(
  code: string,
): Promise<AeroAPIOperatorInfo | null> {
  try {
    return await getAeroApiClient().getOperatorInfo(code);
  } catch (err) {
    if (err instanceof AeroAPIError && err.status === 404) {
      return null;
    }
    if (err instanceof AeroAPIError) {
      throw new UpstreamError(`AeroAPI failed: ${err.message}`);
    }
    throw err;
  }
}

async function persistAirlineFromAeroApi(
  info: AeroAPIOperatorInfo,
): Promise<Airline> {
  const icao = normalizeIcao(info.icao);
  const airline = airlineRepo().create({
    icaoCode: icao,
    iataCode: info.iata ? info.iata.toUpperCase() : null,
    name: info.name,
  });

  try {
    await airlineRepo().save(airline);
  } catch (err: unknown) {
    if (!hasDbCode(err) || err.code !== "23505") throw err;
  }

  const reloaded = await airlineRepo().findOne({ where: { icaoCode: icao } });
  if (!reloaded) {
    throw new Error(`Airline ${icao} disappeared after insert`);
  }
  return reloaded;
}

export async function getOrFetchAirline(code: string): Promise<Airline> {
  const local = await findAirlineInDb(code);
  if (local) return local;

  const remote = await fetchOperatorFromAeroApi(code);
  if (!remote) {
    throw new NotFoundError(`Airline "${code}" not found in DB or AeroAPI`);
  }

  return persistAirlineFromAeroApi(remote);
}

export async function searchAirlines(
  q: string,
  limit = 20,
): Promise<Airline[]> {
  const term = q.trim();
  if (!term) return [];
  const normalized = normalizeIcao(term);
  const like = `%${term}%`;

  return airlineRepo().find({
    where: [
      { icaoCode: normalized },
      { iataCode: normalized },
      { name: ILike(like) },
    ],
    take: Math.min(Math.max(limit, 1), 100),
    order: { name: "ASC" },
  });
}

export async function listAirlines(
  limit = 50,
  offset = 0,
): Promise<{ items: Airline[]; total: number }> {
  const [items, total] = await airlineRepo().findAndCount({
    take: Math.min(Math.max(limit, 1), 200),
    skip: Math.max(offset, 0),
    order: { icaoCode: "ASC" },
  });
  return { items, total };
}

export async function createAirline(
  input: AirlineCreateInput,
): Promise<Airline> {
  const icao = normalizeIcao(input.icaoCode);
  if (!icao || icao.length !== 3) {
    throw new BadRequestError("icaoCode must be exactly 3 characters");
  }
  if (!input.name?.trim()) {
    throw new BadRequestError("name is required");
  }

  const existing = await airlineRepo().findOne({ where: { icaoCode: icao } });
  if (existing) {
    throw new BadRequestError(`Airline ${icao} already exists`);
  }

  const airline = airlineRepo().create({
    icaoCode: icao,
    iataCode: input.iataCode ? input.iataCode.toUpperCase() : null,
    name: input.name.trim(),
  });
  return airlineRepo().save(airline);
}

export async function updateAirline(
  code: string,
  input: AirlineUpdateInput,
): Promise<Airline> {
  const icao = normalizeIcao(code);
  const airline = await airlineRepo().findOne({ where: { icaoCode: icao } });
  if (!airline) {
    throw new NotFoundError(`Airline ${icao} not found`);
  }

  if (input.iataCode !== undefined) {
    airline.iataCode = input.iataCode ? input.iataCode.toUpperCase() : null;
  }
  if (input.name !== undefined) airline.name = input.name.trim();

  return airlineRepo().save(airline);
}

export async function deleteAirline(code: string): Promise<void> {
  const icao = normalizeIcao(code);
  const result = await airlineRepo().delete({ icaoCode: icao });
  if (!result.affected) {
    throw new NotFoundError(`Airline ${icao} not found`);
  }
}
