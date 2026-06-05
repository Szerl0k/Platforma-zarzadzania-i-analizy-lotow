/**
 * Error thrown when a requested bounding box area exceeds the system's security limits.
 * Typically results in a 400 Bad Request response.
 */
export class BoundingBoxLimitError extends Error {
  public readonly statusCode: number = 400;

  constructor(message: string) {
    super(message);

    this.name = "BoundingBoxLimitError";
    this.statusCode = 400;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BoundingBoxLimitError);
    }
  }
}

// RateLimitExceededError moved to common/errors — cross-cutting concern.
// Import it from "../common/errors".

/**
 * Error thrown when received telemetry data is considered too old to be useful.
 * Typically results in a 409 Conflict response.
 */
export class DataStaleError extends Error {
  public readonly statusCode: number = 409;

  constructor(message: string = "Received telemetry data is stale.") {
    super(message);
    this.name = "DataStaleError";
    if (Error.captureStackTrace) Error.captureStackTrace(this, DataStaleError);
  }
}
