import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { FlightService } from "../services/flight.service";

const router = Router();
const flightService = new FlightService();

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

    const result = await flightService.getFlightDetailsAndSave(validatedQuery.icaoCode);

    if (!result) {
      res.status(404).json({
        error: `Could not find flight details for ICAO code: ${validatedQuery.icaoCode}`,
      });
      return;
    }
    
    res.json(result);
  }),
);

export default router;
