import { Router, Request, Response, NextFunction } from "express";

import { TelemetryService } from "./telemetry.service";
import { LocateFlightQuerySchema } from "./telemetry.dto";

import { BoundingBoxAreaQuerySchema } from "./telemetry.dto";
import { BoundingBoxLimitError } from "./telemetry.errors";
import { mapAreaRateLimiter } from "../common/middleware/rateLimiter";
import { cacheMapArea } from "../common/middleware/cache";

const router = Router();
const telemetryService = new TelemetryService();

/**
 * Hermetyzuje asynchroniczne funkcje obłusgi żądań, automatycznie przekazując
 * nieprzechwycone wyjątki go globalnego middleware
 */
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

/**
 * Endpoint GET /telemetry/locate
 * Realizuje strategię wyszukiwania samolotu Bounding Box poprzez orkiestrację danych z AeroAPI i OpenSky Network API.
 * Wynik operacji jest trwale zapisywany w bazie PostgreSQL (z PostGIS)
 */

router.get(
  "/locate",
  asyncHandler(async (req, res) => {
    const validatedQuery = LocateFlightQuerySchema.parse(req.query);

    const result = await telemetryService.locateAndSaveFlight(
      validatedQuery.faFlightId,
    );

    if (!result) {
      res.status(404).json({
        error: "Could not find active ADS-B signal in selected flight section",
      });
      return;
    }
    res.json(result);
  }),
);

/**
 *
 */
router.get(
  "/area",
  mapAreaRateLimiter,
  cacheMapArea,
  asyncHandler(async (req, res) => {
    const validatedQuery = BoundingBoxAreaQuerySchema.parse(req.query);

    try {
      const flights = await telemetryService.getFlightsInArea(validatedQuery);
      res.json(flights);
    } catch (error: unknown) {
      // Capture bounding box error as it's a client error, not server error
      if (error instanceof BoundingBoxLimitError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      throw error;
    }
  }),
);
export default router;
