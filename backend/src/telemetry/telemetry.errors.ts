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

/**
 * Error thrown when an external API rate limit is reached.
 * Typically results in a 429 Too Many Requests response.
 */
export class RateLimitExceededError extends Error {
  public readonly statusCode: number = 429;

  constructor(message: string = "Token limit exceeded for external API") {
    super(message);
    this.name = "RateLimitExceededError";
    if (Error.captureStackTrace)
      Error.captureStackTrace(this, RateLimitExceededError);
  }
}

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
