import { Router, Request, Response } from "express";
import { handleHttpError } from "../../common/errors/handle";
import {
  createRole,
  deleteRole,
  grantPermission,
  listRolePermissions,
  listRoles,
  revokePermission,
  updateRole,
} from "../roles.service";

const router = Router();

router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const roles = await listRoles();
    res.json(roles);
  } catch (err: unknown) {
    handleHttpError(err, res);
  }
});

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const role = await createRole({
      name: req.body.name,
      description: req.body.description,
    });
    res.status(201).json(role);
  } catch (err: unknown) {
    handleHttpError(err, res);
  }
});

router.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const roleId = Number.parseInt(req.params.id as string, 10);
    const role = await updateRole(roleId, {
      name: req.body.name,
      description: req.body.description,
    });
    res.json(role);
  } catch (err: unknown) {
    handleHttpError(err, res);
  }
});

router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const roleId = Number.parseInt(req.params.id as string, 10);
    await deleteRole(roleId);
    res.status(204).send();
  } catch (err: unknown) {
    handleHttpError(err, res);
  }
});

router.get(
  "/:id/permissions",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const roleId = Number.parseInt(req.params.id as string, 10);
      const permissions = await listRolePermissions(roleId);
      res.json(permissions);
    } catch (err: unknown) {
      handleHttpError(err, res);
    }
  },
);

router.post(
  "/:id/permissions",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const roleId = Number.parseInt(req.params.id as string, 10);
      const rolePermission = await grantPermission(roleId, req.body.permissionId);
      res.status(201).json(rolePermission);
    } catch (err: unknown) {
      handleHttpError(err, res);
    }
  },
);

router.delete(
  "/:id/permissions/:permissionId",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const roleId = Number.parseInt(req.params.id as string, 10);
      const permissionId = Number.parseInt(req.params.permissionId as string, 10);
      await revokePermission(roleId, permissionId);
      res.status(204).send();
    } catch (err: unknown) {
      handleHttpError(err, res);
    }
  },
);

export default router;
