import { Router, Request, Response } from "express";
import { authorize } from "../../common/middleware/auth";
import { handleHttpError } from "../../common/errors/handle";
import {
  assignRole,
  deleteUser,
  getCurrentUser,
  getPublicProfile,
  listUsers,
  updateCurrentUser,
} from "../users.service";

const router = Router();

router.get("/me", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getCurrentUser(req.userId ?? "");
    res.json(user);
  } catch (err: unknown) {
    handleHttpError(err, res);
  }
});

router.patch("/me", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await updateCurrentUser(req.userId ?? "", {
      nickname: req.body.nickname,
      profilePublic: req.body.profilePublic,
    });
    res.json(user);
  } catch (err: unknown) {
    handleHttpError(err, res);
  }
});

router.get(
  "/",
  authorize("users:write"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const pageRaw =
        typeof req.query.page === "string"
          ? Number.parseInt(req.query.page, 10)
          : 1;
      const limitRaw =
        typeof req.query.limit === "string"
          ? Number.parseInt(req.query.limit, 10)
          : 20;
      const result = await listUsers({
        q: typeof req.query.q === "string" ? req.query.q : undefined,
        page: Number.isNaN(pageRaw) ? 1 : pageRaw,
        limit: Number.isNaN(limitRaw) ? 20 : limitRaw,
      });
      res.json(result);
    } catch (err: unknown) {
      handleHttpError(err, res);
    }
  },
);

router.patch(
  "/:id/role",
  authorize("users:write"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await assignRole(
        req.params.id as string,
        req.body.roleId,
        req.userId ?? "",
      );
      res.json(user);
    } catch (err: unknown) {
      handleHttpError(err, res);
    }
  },
);

router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await getPublicProfile(
      req.params.id as string,
      req.roleId ?? null,
    );
    res.json(profile);
  } catch (err: unknown) {
    handleHttpError(err, res);
  }
});

router.delete(
  "/:id",
  authorize("users:delete"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await deleteUser(req.params.id as string, req.userId ?? "");
      res.status(204).send();
    } catch (err: unknown) {
      handleHttpError(err, res);
    }
  },
);

export default router;
