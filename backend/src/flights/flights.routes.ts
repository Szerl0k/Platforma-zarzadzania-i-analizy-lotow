import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { FlightsService } from "./flights.service";
import { FlightNotFoundError } from "../common/errors";

const router = Router();
const flightService = new FlightsService();

const FlightDetailsQuerySchema = z.object({
  icaoCode: z
    .string()
    .min(1, "Kod ICAO jest wymagany do pobrania szczegółów lotu."),
});

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

/**
 * Endpoint GET /flights/details
 * Fetch commercial flight details based on ICAO code and save to DB
 */
router.get(
  "/details",
  asyncHandler(async (req, res) => {
    const validatedQuery = FlightDetailsQuerySchema.parse(req.query);

    try {
      const result = await flightService.getFlightDetailsAndSave(validatedQuery.icaoCode);
      res.json(result);
    } catch (error) {
      if (error instanceof FlightNotFoundError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      throw error;
    }
  }),
);

export default router;
