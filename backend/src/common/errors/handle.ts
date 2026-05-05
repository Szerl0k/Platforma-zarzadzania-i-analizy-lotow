import { Response } from "express";
import { HttpError } from "./http-errors";

export function handleHttpError(err: unknown, res: Response): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: "Internal server error" });
}
