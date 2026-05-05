import { Router, Request, Response } from "express";
import { handleHttpError } from "../../common/errors/handle";
import {
  createPermission,
  deletePermission,
  listPermissions,
} from "../permissions.service";

const router = Router();

router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const permissions = await listPermissions();
    res.json(permissions);
  } catch (err: unknown) {
    handleHttpError(err, res);
  }
});

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const permission = await createPermission({
      name: req.body.name,
      resource: req.body.resource,
      action: req.body.action,
      description: req.body.description,
    });
    res.status(201).json(permission);
  } catch (err: unknown) {
    handleHttpError(err, res);
  }
});

router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const permissionId = Number.parseInt(req.params.id as string, 10);
    await deletePermission(permissionId);
    res.status(204).send();
  } catch (err: unknown) {
    handleHttpError(err, res);
  }
});

export default router;
