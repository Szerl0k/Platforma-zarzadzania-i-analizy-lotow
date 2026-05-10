import { Router, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { ZodError } from "zod";
import { CityBreakService } from "./city-break.service";
import {
  SearchCityBreakQuerySchema,
  ProposalDetailsQuerySchema,
} from "./city-break.dto";
import { handleHttpError } from "../common/errors/handle";
import { BadRequestError } from "../common/errors/http-errors";

const router = Router();
const service = new CityBreakService();

const cityBreakRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: "Zbyt wiele zapytań do wyszukiwarki city break. Odczekaj chwilę.",
    });
  },
});

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

function handle(err: unknown, res: Response): void {
  if (err instanceof ZodError) {
    const message = err.issues
      .map((i) => `${i.path.join(".") || "query"}: ${i.message}`)
      .join("; ");
    handleHttpError(new BadRequestError(message), res);
    return;
  }
  handleHttpError(err, res);
}

router.get(
  "/search",
  cityBreakRateLimiter,
  asyncHandler(async (req, res) => {
    try {
      const query = SearchCityBreakQuerySchema.parse(req.query);
      const proposals = await service.searchProposals(query);
      res.json({ items: proposals, count: proposals.length });
    } catch (err) {
      handle(err, res);
    }
  }),
);

router.get(
  "/proposals/:destinationIcao/details",
  cityBreakRateLimiter,
  asyncHandler(async (req, res) => {
    try {
      const query = ProposalDetailsQuerySchema.parse(req.query);
      const destinationIcao = String(req.params.destinationIcao ?? "");
      if (!destinationIcao) {
        handleHttpError(
          new BadRequestError("destinationIcao jest wymagany"),
          res,
        );
        return;
      }
      const result = await service.getProposalDetails(destinationIcao, query);
      res.json(result);
    } catch (err) {
      handle(err, res);
    }
  }),
);

export default router;
