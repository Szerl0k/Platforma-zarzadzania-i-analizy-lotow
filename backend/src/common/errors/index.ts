import { HttpError } from "./http-errors";

// Pojedynczy barrel błędów aplikacji — kanoniczna hierarchia HttpError oraz
// jej domenowe aliasy. Wszystkie błędy dziedziczą po HttpError, więc niosą
// zarówno `status`, jak i alias `statusCode`, i są jednolicie mapowane przez
// `respondWithError` (zob. ./respond).
export * from "./http-errors";

export class FlightNotFoundError extends HttpError {
  constructor(message: string = "Flight details not found") {
    super(404, message);
    this.name = "FlightNotFoundError";
  }
}

export class TelemetryNotFoundError extends HttpError {
  constructor(message: string = "Telemetry data not found") {
    super(404, message);
    this.name = "TelemetryNotFoundError";
  }
}

/**
 * Błąd wyczerpania limitu zewnętrznego API. Należy do `common`, bo jest
 * przekrojowy — współdzielony przez middleware i integracje.
 */
export class RateLimitExceededError extends HttpError {
  constructor(message: string = "Token limit exceeded for external API") {
    super(429, message);
    this.name = "RateLimitExceededError";
  }
}
