import { Response } from "express";
import { respondWithError } from "./respond";

export function handleHttpError(err: unknown, res: Response): void {
  respondWithError(err, res.req, res);
}
