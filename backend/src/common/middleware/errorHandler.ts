import { NextFunction, Request, Response } from "express";
import { respondWithError } from "../errors/respond";

export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  respondWithError(err, req, res);
}
