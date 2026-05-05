import { Router, Request, Response } from "express";
import { handleHttpError } from "../../common/errors/handle";
import { getPreferences, updatePreferences } from "../preferences.service";

const router = Router();

router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const preferences = await getPreferences(req.userId ?? "");
    res.json(preferences);
  } catch (err: unknown) {
    handleHttpError(err, res);
  }
});

router.patch("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const preferences = await updatePreferences(
      req.userId ?? "",
      req.body as Record<string, unknown>,
    );
    res.json(preferences);
  } catch (err: unknown) {
    handleHttpError(err, res);
  }
});

export default router;
