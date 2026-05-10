import { Router, Request, Response } from "express";
import { handleHttpError } from "../common/errors/handle";
import {
  addFavorite,
  listFavoritesForUser,
  removeFavorite,
} from "./favorites.service";

const router = Router();

router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const items = await listFavoritesForUser(req.userId ?? "");
    res.json({ items, count: items.length });
  } catch (err) {
    handleHttpError(err, res);
  }
});

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const created = await addFavorite(
      req.userId ?? "",
      String(req.body?.airportIcao ?? ""),
      typeof req.body?.notes === "string" ? req.body.notes : null,
    );
    res.status(201).json(created);
  } catch (err) {
    handleHttpError(err, res);
  }
});

router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    await removeFavorite(req.userId ?? "", String(req.params.id ?? ""));
    res.status(204).send();
  } catch (err) {
    handleHttpError(err, res);
  }
});

export default router;
