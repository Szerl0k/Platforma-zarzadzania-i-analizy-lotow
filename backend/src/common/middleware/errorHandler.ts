import { NextFunction, Request, Response } from "express";
import { respondWithError } from "../errors/respond";

/**
 * Globalny handler błędów (ostatni middleware). Całość mapowania i logowania
 * deleguje do wspólnego `respondWithError`, dzięki czemu zwraca identyczny
 * kształt odpowiedzi co `handleHttpError` używany w trasach z `try/catch`.
 */
export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  respondWithError(err, req, res);
}
