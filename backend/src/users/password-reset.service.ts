import bcrypt from "bcrypt";
import crypto from "crypto";
import { AppDataSource } from "../common/database/data-source";
import { User } from "./entities/User";
import { RefreshToken } from "./entities/RefreshToken";
import { BadRequestError } from "../common/errors/http-errors";
import { Mailer } from "./mailer";

export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const PASSWORD_HASH_ROUNDS = 12;

export function hashResetToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function generateResetTokenRaw(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function requestPasswordReset(
  email: unknown,
  mailer: Mailer,
  appBaseUrl: string,
  now: Date = new Date(),
): Promise<void> {
  if (typeof email !== "string" || email.length === 0) {
    throw new BadRequestError("Email is required");
  }

  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { email } });
  if (!user) return;

  const rawToken = generateResetTokenRaw();
  user.passwordResetToken = hashResetToken(rawToken);
  user.passwordResetExpires = new Date(
    now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS,
  );
  user.updatedAt = now;
  await userRepo.save(user);

  const resetLink = `${appBaseUrl.replace(/\/+$/, "")}/reset-password?token=${rawToken}`;
  await mailer.sendPasswordReset(user.email, resetLink);
}

export interface ResetPasswordInput {
  token: unknown;
  password: unknown;
}

export async function resetPassword(
  input: ResetPasswordInput,
  now: Date = new Date(),
): Promise<void> {
  if (typeof input.token !== "string" || input.token.length === 0) {
    throw new BadRequestError("Token is required");
  }
  if (typeof input.password !== "string" || input.password.length < 6) {
    throw new BadRequestError("Password must be at least 6 characters");
  }

  const tokenHash = hashResetToken(input.token);

  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({
    where: { passwordResetToken: tokenHash },
  });

  if (!user || !user.passwordResetExpires || user.passwordResetExpires < now) {
    throw new BadRequestError("Invalid or expired token");
  }

  user.passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS);
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  user.updatedAt = now;
  await userRepo.save(user);

  const refreshRepo = AppDataSource.getRepository(RefreshToken);
  await refreshRepo.delete({ userId: user.id });
}
