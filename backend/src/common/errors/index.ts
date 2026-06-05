export class FlightNotFoundError extends Error {
  public readonly statusCode: number = 404;

  constructor(message: string = "Flight details not found") {
    super(message);
    this.name = "FlightNotFoundError";
    if (Error.captureStackTrace)
      Error.captureStackTrace(this, FlightNotFoundError);
  }
}

export class TelemetryNotFoundError extends Error {
  public readonly statusCode: number = 404;

  constructor(message: string = "Telemetry data not found") {
    super(message);
    this.name = "TelemetryNotFoundError";
    if (Error.captureStackTrace)
      Error.captureStackTrace(this, TelemetryNotFoundError);
  }
}

/**
 * Error thrown when an external API rate limit is reached. Lives in `common`
 * because it is a cross-cutting concern shared by middleware and integrations.
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
