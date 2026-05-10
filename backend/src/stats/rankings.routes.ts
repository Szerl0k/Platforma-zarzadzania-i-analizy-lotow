import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../common/middleware/auth";
import { apiRateLimiter } from "../common/middleware/rateLimiter";
import { RankingsService } from "./rankings.service";
import { MyRankingQuerySchema, RankingsQuerySchema } from "./stats.dto";

const router = Router();
const service = new RankingsService();

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// Public — top-100 list
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = RankingsQuerySchema.parse(req.query);
    const items = await service.getRankings(query.metric, query.limit);
    res.json({ items });
  }),
);

// Authenticated — caller's row
router.get(
  "/me",
  apiRateLimiter,
  authenticate,
  asyncHandler(async (req, res) => {
    const query = MyRankingQuerySchema.parse(req.query);
    const result = await service.getMyRanking(query.metric, req.userId ?? "");
    res.json(result);
  }),
);

export default router;
