import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit'
import {RateLimitExceededError} from "../../telemetry/telemetry.errors";

/**
 * Rate Limiter for the Map
 * Limits user to 15 requests per minute.
 */
export const mapAreaRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute time window
    max: 15, // Max 15 requests per IP in one time window
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response, next: NextFunction) => {
        next(new RateLimitExceededError('The limit on map area queries has been exceeded. Please wait a moment.'))
    }
})