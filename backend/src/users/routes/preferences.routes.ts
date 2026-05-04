import { Router, Request, Response } from "express";
import { AppDataSource } from "../../common/database/data-source";
import { UserPreferences } from "../entities/UserPreferences";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  const prefsRepo = AppDataSource.getRepository(UserPreferences);
  const prefs = await prefsRepo.findOne({ where: { userId: req.userId } });

  if (!prefs) {
    res.status(404).json({ error: "Preferences not found" });
    return;
  }

  res.json(prefs);
});

router.patch("/", async (req: Request, res: Response) => {
  const prefsRepo = AppDataSource.getRepository(UserPreferences);
  const prefs = await prefsRepo.findOne({ where: { userId: req.userId } });

  if (!prefs) {
    res.status(404).json({ error: "Preferences not found" });
    return;
  }

  const allowedFields = [
    "emailNotifications",
    "pushNotifications",
    "notifyOnDelay",
    "notifyOnGateChange",
    "notifyOnStatusChange",
    "delayThresholdMinutes",
    "timezone",
    "distanceUnit",
  ] as const;

  type AllowedField = (typeof allowedFields)[number];
  const updates: Partial<Pick<UserPreferences, AllowedField>> = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      (updates as Record<string, unknown>)[field] = req.body[field];
    }
  }

  prefsRepo.merge(prefs, updates);
  prefs.updatedAt = new Date();
  await prefsRepo.save(prefs);

  res.json(prefs);
});

export default router;
