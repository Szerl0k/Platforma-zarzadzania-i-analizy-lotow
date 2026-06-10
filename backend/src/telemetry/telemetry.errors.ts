import { HttpError } from "../common/errors/http-errors";

/**
 * Błąd zgłaszany, gdy żądana ramka (bounding box) przekracza limity bezpieczeństwa.
 * Mapowany na 400 Bad Request.
 */
export class BoundingBoxLimitError extends HttpError {
  constructor(message: string) {
    super(400, message);
    this.name = "BoundingBoxLimitError";
  }
}

// RateLimitExceededError moved to common/errors — cross-cutting concern.
// Import it from "../common/errors".

/**
 * Błąd zgłaszany, gdy otrzymane dane telemetryczne są zbyt stare, by były użyteczne.
 * Mapowany na 409 Conflict.
 */
export class DataStaleError extends HttpError {
  constructor(message: string = "Received telemetry data is stale.") {
    super(409, message);
    this.name = "DataStaleError";
  }
}
