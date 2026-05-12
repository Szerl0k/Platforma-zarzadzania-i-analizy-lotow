import {
  airportRepo,
  cityRepo,
  countryRepo,
  normalizeIcao,
  hasDbCode,
  makePoint,
  extractCoordinates,
  NotFoundError,
  BadRequestError,
  UpstreamError,
  AirportCreateInput,
  AirportUpdateInput,
} from "./geo.utils";
import { Airport } from "./entities/Airport";
import { City } from "./entities/City";
import {
  getAeroApiClient,
  AeroAPIError,
  AeroAPIAirportInfo,
} from "../common/integrations/aeroapi";

async function findOrCreateCity(
  countryCode: string,
  cityName: string,
): Promise<City> {
  const code = countryCode.trim().toUpperCase();
  const name = cityName.trim();

  const country = await countryRepo().findOne({ where: { isoCode: code } });
  if (!country) {
    throw new BadRequestError(`Unknown country code "${code}"`);
  }

  const existing = await cityRepo().findOne({
    where: { countryCode: code, name },
  });
  if (existing) return existing;

  const city = cityRepo().create({ countryCode: code, name });
  try {
    return await cityRepo().save(city);
  } catch (err: unknown) {
    if (hasDbCode(err) && err.code === "23505") {
      const refetched = await cityRepo().findOne({
        where: { countryCode: code, name },
      });
      if (refetched) return refetched;
    }
    throw err;
  }
}

export async function findAirportInDb(code: string): Promise<Airport | null> {
  const normalized = normalizeIcao(code);
  return airportRepo().findOne({
    where: [{ icaoCode: normalized }, { iataCode: normalized }],
    relations: ["city", "city.country"],
  });
}

async function fetchAirportFromAeroApi(
  code: string,
): Promise<AeroAPIAirportInfo | null> {
  try {
    return await getAeroApiClient().getAirportInfo(code);
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

function resolveAirportCodes(info: AeroAPIAirportInfo): {
  icao: string;
  iata: string | null;
} {
  const primary = normalizeIcao(info.airport_code);
  const alt = info.alternate_ident ? normalizeIcao(info.alternate_ident) : null;

  if (primary.length === 4) {
    return { icao: primary, iata: alt && alt.length === 3 ? alt : null };
  }
  if (primary.length === 3 && alt && alt.length === 4) {
    return { icao: alt, iata: primary };
  }
  return { icao: primary, iata: alt };
}

async function persistAirportFromAeroApi(
  info: AeroAPIAirportInfo,
): Promise<Airport> {
  const { icao, iata } = resolveAirportCodes(info);
  const city = await findOrCreateCity(info.country_code, info.city);

  const airport = airportRepo().create({
    icaoCode: icao,
    iataCode: iata,
    name: info.name,
    cityId: city.id,
    location: makePoint(info.latitude, info.longitude),
    timezone: info.timezone,
  });

  try {
    await airportRepo().save(airport);
  } catch (err: unknown) {
    if (!hasDbCode(err) || err.code !== "23505") throw err;
  }

  const reloaded = await airportRepo().findOne({
    where: { icaoCode: icao },
    relations: ["city", "city.country"],
  });
  if (!reloaded) {
    throw new Error(`Airport ${icao} disappeared after insert`);
  }
  return reloaded;
}

export async function getOrFetchAirport(code: string): Promise<Airport> {
  const local = await findAirportInDb(code);
  if (local) return local;

  const remote = await fetchAirportFromAeroApi(code);
  if (!remote) {
    throw new NotFoundError(`Airport "${code}" not found in DB or AeroAPI`);
  }

  return persistAirportFromAeroApi(remote);
}

export async function searchAirports(
  q: string,
  limit = 20,
): Promise<Airport[]> {
  const term = q.trim();
  if (!term) return [];
  const normalized = normalizeIcao(term);
  const like = `%${term}%`;
  return airportRepo()
    .createQueryBuilder("airport")
    .leftJoinAndSelect("airport.city", "city")
    .leftJoinAndSelect("city.country", "country")
    .where("airport.icao_code = :normalized", { normalized })
    .orWhere("airport.iata_code = :normalized", { normalized })
    .orWhere("airport.name ILIKE :like", { like })
    .orWhere("city.name ILIKE :like", { like })
    .orderBy("airport.name", "ASC")
    .take(Math.min(Math.max(limit, 1), 100))
    .getMany();
}

export async function listAirports(
  limit = 50,
  offset = 0,
): Promise<{ items: Airport[]; total: number }> {
  const [items, total] = await airportRepo().findAndCount({
    relations: ["city", "city.country"],
    take: Math.min(Math.max(limit, 1), 200),
    skip: Math.max(offset, 0),
    order: { icaoCode: "ASC" },
  });
  return { items, total };
}

export async function listAirportsInArea(
  lomin: number,
  lamin: number,
  lomax: number,
  lamax: number,
  limit = 300,
): Promise<Airport[]> {
  return airportRepo()
    .createQueryBuilder("airport")
    .leftJoinAndSelect("airport.city", "city")
    .leftJoinAndSelect("city.country", "country")
    .where(
      "ST_Within(airport.location, ST_MakeEnvelope(:lomin, :lamin, :lomax, :lamax, 4326))",
      { lomin, lamin, lomax, lamax },
    )
    .take(Math.min(Math.max(limit, 1), 500))
    .getMany();
}

export async function createAirport(
  input: AirportCreateInput,
): Promise<Airport> {
  const icao = normalizeIcao(input.icaoCode);
  if (!icao || icao.length < 3 || icao.length > 4) {
    throw new BadRequestError("icaoCode must be 3-4 characters");
  }
  if (!input.name?.trim()) {
    throw new BadRequestError("name is required");
  }
  if (
    typeof input.latitude !== "number" ||
    typeof input.longitude !== "number"
  ) {
    throw new BadRequestError("latitude and longitude are required numbers");
  }
  if (!input.timezone?.trim()) {
    throw new BadRequestError("timezone is required");
  }
  if (!input.countryCode?.trim() || !input.cityName?.trim()) {
    throw new BadRequestError("countryCode and cityName are required");
  }

  const existing = await airportRepo().findOne({ where: { icaoCode: icao } });
  if (existing) {
    throw new BadRequestError(`Airport ${icao} already exists`);
  }

  const city = await findOrCreateCity(input.countryCode, input.cityName);
  const airport = airportRepo().create({
    icaoCode: icao,
    iataCode: input.iataCode ? input.iataCode.toUpperCase() : null,
    name: input.name.trim(),
    cityId: city.id,
    location: makePoint(input.latitude, input.longitude),
    timezone: input.timezone,
  });

  await airportRepo().save(airport);

  const reloaded = await airportRepo().findOne({
    where: { icaoCode: icao },
    relations: ["city", "city.country"],
  });
  return reloaded!;
}

export async function updateAirport(
  code: string,
  input: AirportUpdateInput,
): Promise<Airport> {
  const icao = normalizeIcao(code);
  const airport = await airportRepo().findOne({
    where: { icaoCode: icao },
    relations: ["city", "city.country"],
  });
  if (!airport) {
    throw new NotFoundError(`Airport ${icao} not found`);
  }

  if (input.iataCode !== undefined) {
    airport.iataCode = input.iataCode ? input.iataCode.toUpperCase() : null;
  }
  if (input.name !== undefined) airport.name = input.name.trim();
  if (input.timezone !== undefined) airport.timezone = input.timezone;
  if (input.latitude !== undefined || input.longitude !== undefined) {
    const { latitude, longitude } = extractCoordinates(airport.location);
    airport.location = makePoint(
      input.latitude ?? latitude,
      input.longitude ?? longitude,
    );
  }
  if (input.countryCode !== undefined || input.cityName !== undefined) {
    const targetCountry = input.countryCode ?? airport.city.countryCode;
    const targetCity = input.cityName ?? airport.city.name;
    const city = await findOrCreateCity(targetCountry, targetCity);
    airport.cityId = city.id;
  }

  await airportRepo().save(airport);

  const reloaded = await airportRepo().findOne({
    where: { icaoCode: icao },
    relations: ["city", "city.country"],
  });
  return reloaded!;
}

export async function deleteAirport(code: string): Promise<void> {
  const icao = normalizeIcao(code);
  const result = await airportRepo().delete({ icaoCode: icao });
  if (!result.affected) {
    throw new NotFoundError(`Airport ${icao} not found`);
  }
}
