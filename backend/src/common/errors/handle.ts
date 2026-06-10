import { Response } from "express";
import { respondWithError } from "./respond";

/**
 * Pomocnik używany w trasach z `try/catch`. Deleguje do wspólnego
 * `respondWithError`, więc obsługuje całą kanoniczną hierarchię `HttpError`,
 * błędy `ZodError`, kody PostgreSQL oraz błędy integracji — z tym samym
 * ujednoliconym kształtem odpowiedzi co globalny error handler.
 */
export function handleHttpError(err: unknown, res: Response): void {
  respondWithError(err, res.req, res);
}
