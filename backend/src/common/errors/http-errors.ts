export class HttpError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = new.target.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target);
    }
  }

  /**
   * Alias zgodności. Historycznie część błędów i handlerów używała pola
   * `statusCode` (np. legacy klasy w modułach geo/telemetry). Po ujednoliceniu
   * całej hierarchii do `HttpError` ten getter pozwala każdemu konsumentowi
   * odczytać kod HTTP niezależnie od użytej nazwy pola.
   */
  get statusCode(): number {
    return this.status;
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string) {
    super(400, message);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string) {
    super(401, message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message: string) {
    super(403, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string) {
    super(404, message);
  }
}

export class ConflictError extends HttpError {
  constructor(message: string) {
    super(409, message);
  }
}

export class InternalError extends HttpError {
  constructor(message: string) {
    super(500, message);
  }
}

export class BadGatewayError extends HttpError {
  constructor(message: string) {
    super(502, message);
  }
}
