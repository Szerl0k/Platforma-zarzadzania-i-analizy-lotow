import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { RateLimitExceededError } from "../errors";

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res
      .status(429)
      .json({ error: "Too many requests, please try again later." });
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res
      .status(429)
      .json({ error: "Too many requests, please try again later." });
  },
});

export const mapAreaRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute time window
  max: 15, // Max 15 requests per IP in one time window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response, next: NextFunction) => {
    next(
      new RateLimitExceededError(
        "The limit on map area queries has been exceeded. Please wait a moment.",
      ),
    );
  },
});
