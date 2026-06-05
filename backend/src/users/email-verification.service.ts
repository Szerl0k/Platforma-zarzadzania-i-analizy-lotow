import crypto from "crypto";
import { AppDataSource } from "../common/database/data-source";
import { User } from "./entities/User";
import { BadRequestError } from "../common/errors/http-errors";
import { Mailer } from "./mailer";

export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function hashVerificationToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function generateVerificationTokenRaw(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function buildVerificationLink(
  appBaseUrl: string,
  rawToken: string,
): string {
  return `${appBaseUrl.replace(/\/+$/, "")}/verify-email?token=${rawToken}`;
}

/**
 * Confirms a user's email address from a raw verification token.
 * Idempotent failure: invalid/expired tokens raise BadRequestError.
 */
export async function verifyEmail(
  token: unknown,
  now: Date = new Date(),
): Promise<void> {
  if (typeof token !== "string" || token.length === 0) {
    throw new BadRequestError("Token weryfikacyjny jest wymagany.");
  }

  const tokenHash = hashVerificationToken(token);
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({
    where: { verificationToken: tokenHash },
  });

  if (
    !user ||
    !user.verificationTokenExpires ||
    user.verificationTokenExpires < now
  ) {
    throw new BadRequestError(
      "Link weryfikacyjny jest nieprawidłowy lub wygasł.",
    );
  }

  user.emailVerified = true;
  user.verificationToken = null;
  user.verificationTokenExpires = null;
  user.updatedAt = now;
  await userRepo.save(user);
}

/**
 * Re-issues a verification token and e-mail for an unverified account.
 * Silent no-op when the account does not exist or is already verified
 * (avoids leaking which e-mails are registered).
 */
export async function resendVerification(
  email: unknown,
  mailer: Mailer,
  appBaseUrl: string,
  now: Date = new Date(),
): Promise<void> {
  if (typeof email !== "string" || email.length === 0) {
    throw new BadRequestError("Email jest wymagany.");
  }

  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { email } });
  if (!user || user.emailVerified) return;

  const rawToken = generateVerificationTokenRaw();
  user.verificationToken = hashVerificationToken(rawToken);
  user.verificationTokenExpires = new Date(
    now.getTime() + VERIFICATION_TOKEN_TTL_MS,
  );
  user.updatedAt = now;
  await userRepo.save(user);

  await mailer.sendVerificationEmail(
    user.email,
    buildVerificationLink(appBaseUrl, rawToken),
  );
}
