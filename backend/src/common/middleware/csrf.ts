import { Request } from "express";
import { doubleCsrf } from "csrf-csrf";

const isProduction = process.env.NODE_ENV === "production";

export const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET ?? "csrf-dev-secret-change-in-prod",
  getSessionIdentifier: (req: Request) =>
    (req.cookies?.access_token as string | undefined) ?? req.ip ?? "",
  cookieName: isProduction ? "__Host-psifi.x-csrf-token" : "x-csrf-token",
  cookieOptions: {
    httpOnly: true,
    sameSite: "strict",
    secure: isProduction,
    path: "/",
  },
  size: 64,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
});
