import { Router, Request, Response, NextFunction } from "express";
import { StatsService } from "./stats.service";
import { RoutesQuerySchema } from "./stats.dto";

const router = Router();
const service = new StatsService();

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const result = await service.getMyStats(req.userId ?? "");
    res.json(result);
  }),
);

router.get(
  "/me/routes",
  asyncHandler(async (req, res) => {
    const query = RoutesQuerySchema.parse(req.query);
    const result = await service.getMyRoutes(req.userId ?? "", query.year);
    res.json(result);
  }),
);

export default router;
