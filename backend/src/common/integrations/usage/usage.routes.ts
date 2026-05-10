import { Router, Request, Response } from "express";
import { handleHttpError } from "../../errors/handle";
import { getUsageStats } from "./usage.service";

const router = Router();

router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await getUsageStats();
    res.json(stats);
  } catch (err: unknown) {
    handleHttpError(err, res);
  }
});

export default router;
