import { Router } from "express";
import { FlightsService } from "./flights.service";
import { asyncHandler } from "../common/utils/asyncHandler";
import {
  FlightDetailsQuerySchema,
  FlightListQuerySchema,
  CreateFlightSchema,
  UpdateFlightSchema,
} from "./flights.dto";

const router = Router();
const flightService = new FlightsService();

/**
 * Endpoint GET /flights/search
 * Wyszukuje lokalnie w bazie na podstawie ident i date.
 */
router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const validatedQuery = FlightListQuerySchema.parse(req.query);
    const result = await flightService.findFlightsLocally(
      validatedQuery.ident,
      validatedQuery.startDate,
      validatedQuery.endDate,
    );
    res.json(result);
  }),
);

/**
 * Endpoint POST /flights/sync
 * Pobiera listę lotów z AeroAPI i zapisuje do bazy, zwracając wyniki.
 */
router.post(
  "/sync",
  asyncHandler(async (req, res) => {
    const validatedBody = FlightListQuerySchema.parse(req.body);
    const result = await flightService.syncFlightsFromAeroApi(
      validatedBody.ident,
      validatedBody.startDate,
      validatedBody.endDate,
    );
    res.json(result);
  }),
);

/**
 * Endpoint GET /flights/details
 * Fetch commercial flight details based on ICAO/IATA code and save to DB
 */
router.get(
  "/details",
  asyncHandler(async (req, res) => {
    const validatedQuery = FlightDetailsQuerySchema.parse(req.query);
    const result = await flightService.searchFlight(validatedQuery.ident);
    res.json(result);
  }),
);

/**
 * Endpoint GET /flights/:id
 * Get flight details by ID
 */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await flightService.getFlightById(req.params.id as string);
    res.json(result);
  }),
);

/**
 * Endpoint GET /flights/:id/path
 * Get spatial flight path segments (traveled and remaining) as GeoJSON
 */
router.get(
  "/:id/path",
  asyncHandler(async (req, res) => {
    const result = await flightService.getFlightPath(req.params.id as string);
    res.json(result);
  }),
);

/**
 * Endpoint POST /flights
 * Create a new flight record
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const validatedBody = CreateFlightSchema.parse(req.body);
    const result = await flightService.createFlight(validatedBody);
    res.status(201).json(result);
  }),
);

/**
 * Endpoint PUT /flights/:id
 * Update an existing flight record
 */
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const validatedBody = UpdateFlightSchema.parse(req.body);
    const result = await flightService.updateFlight(
      req.params.id as string,
      validatedBody,
    );
    res.json(result);
  }),
);

/**
 * Endpoint DELETE /flights/:id
 * Delete a flight record
 */
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await flightService.deleteFlight(req.params.id as string);
    res.status(204).send();
  }),
);

export default router;
