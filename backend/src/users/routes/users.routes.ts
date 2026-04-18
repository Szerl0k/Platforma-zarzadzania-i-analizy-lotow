import { Router, Request, Response } from "express";
import { ILike } from "typeorm";
import { AppDataSource } from "../../common/database/data-source";
import { User } from "../entities/User";
import { RolePermission } from "../entities/RolePermission";
import { Role } from "../entities/Role";
import { authorize } from "../../common/middleware/auth";

const router = Router();

function sanitizeUser(user: User) {
  const {
    passwordHash,
    verificationToken,
    verificationTokenExpires,
    passwordResetToken,
    passwordResetExpires,
    ...safe
  } = user;
  return safe;
}

async function getPermissionNamesForRole(roleId: number): Promise<string[]> {
  const rpRepo = AppDataSource.getRepository(RolePermission);
  const rolePermissions = await rpRepo.find({
    where: { roleId },
    relations: ["permission"],
  });
  return rolePermissions.map((rp) => rp.permission.name);
}

router.get("/me", async (req: Request, res: Response) => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({
    where: { id: req.userId },
    relations: ["role"],
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const permissions = await getPermissionNamesForRole(user.roleId);
  res.json({ ...sanitizeUser(user), permissions });
});

router.patch("/me", async (req: Request, res: Response) => {
  const { nickname, profilePublic } = req.body;
  const userRepo = AppDataSource.getRepository(User);

  const user = await userRepo.findOne({
    where: { id: req.userId },
    relations: ["role"],
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (nickname !== undefined) user.nickname = nickname;
  if (profilePublic !== undefined) user.profilePublic = profilePublic;
  user.updatedAt = new Date();

  await userRepo.save(user);

  const permissions = await getPermissionNamesForRole(user.roleId);
  res.json({ ...sanitizeUser(user), permissions });
});

router.get(
  "/",
  authorize("users:write"),
  async (req: Request, res: Response) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const page = Math.max(
      1,
      parseInt((req.query.page as string) || "1", 10) || 1,
    );
    const limitRaw = parseInt((req.query.limit as string) || "20", 10) || 20;
    const limit = Math.min(100, Math.max(1, limitRaw));
    const skip = (page - 1) * limit;

    const userRepo = AppDataSource.getRepository(User);
    const where = q
      ? [{ email: ILike(`%${q}%`) }, { nickname: ILike(`%${q}%`) }]
      : undefined;

    const [users, total] = await userRepo.findAndCount({
      where,
      relations: ["role"],
      order: { createdAt: "DESC" },
      skip,
      take: limit,
    });

    res.json({
      items: users.map(sanitizeUser),
      total,
      page,
      limit,
    });
  },
);

router.patch(
  "/:id/role",
  authorize("users:write"),
  async (req: Request, res: Response) => {
    const { roleId } = req.body;

    if (typeof roleId !== "number") {
      res.status(400).json({ error: "roleId (number) is required" });
      return;
    }

    const roleRepo = AppDataSource.getRepository(Role);
    const role = await roleRepo.findOne({ where: { id: roleId } });
    if (!role) {
      res.status(404).json({ error: "Role not found" });
      return;
    }

    if (req.params.id === req.userId) {
      const newPermissions = await getPermissionNamesForRole(roleId);
      if (!newPermissions.includes("users:write")) {
        res
          .status(403)
          .json({ error: "Cannot remove users:write from your own account" });
        return;
      }
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: req.params.id as string },
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    user.roleId = roleId;
    user.updatedAt = new Date();
    await userRepo.save(user);

    const updated = await userRepo.findOne({
      where: { id: user.id },
      relations: ["role"],
    });
    res.json(sanitizeUser(updated!));
  },
);

router.get("/:id", async (req: Request, res: Response) => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({
    where: { id: req.params.id as string },
    relations: ["role"],
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (!user.profilePublic) {
    const requesterPermissions = req.roleId
      ? await getPermissionNamesForRole(req.roleId)
      : [];
    if (!requesterPermissions.includes("users:write")) {
      res.status(403).json({ error: "Profile is private" });
      return;
    }
  }

  res.json({
    id: user.id,
    nickname: user.nickname,
    profilePublic: user.profilePublic,
    createdAt: user.createdAt,
  });
});

router.delete(
  "/:id",
  authorize("users:delete"),
  async (req: Request, res: Response) => {
    if (req.params.id === req.userId) {
      res.status(403).json({ error: "Cannot delete your own account" });
      return;
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: req.params.id as string },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await userRepo.remove(user);
    res.status(204).send();
  },
);

export default router;
