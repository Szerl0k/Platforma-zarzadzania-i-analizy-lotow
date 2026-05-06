import { NextFunction, Request, Response } from "express";
import { doubleCsrf } from "csrf-csrf";

const isProduction = process.env.NODE_ENV === "production";
const csrfCookieName = isProduction
  ? "__Host-psifi.x-csrf-token"
  : "x-csrf-token";
const ignoredMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const anonymousCsrfSession = "anonymous";

const {
  invalidCsrfTokenError,
  generateCsrfToken: generateCsrfTokenInternal,
  validateRequest,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET ?? "csrf-dev-secret-change-in-prod",
  getSessionIdentifier: (req: Request) =>
    (req.cookies?.access_token as string | undefined) ?? anonymousCsrfSession,
  cookieName: csrfCookieName,
  cookieOptions: {
    httpOnly: true,
    sameSite: "strict",
    secure: isProduction,
    path: "/",
  },
  size: 64,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
});

export const generateCsrfToken = generateCsrfTokenInternal;

export function doubleCsrfProtection(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  req.csrfToken = (options): string =>
    generateCsrfTokenInternal(req, res, options);

  if (ignoredMethods.has(req.method)) {
    next();
    return;
  }

  const csrfTokenFromCookie = isProduction
    ? req.cookies?.["__Host-psifi.x-csrf-token"]
    : req.cookies?.["x-csrf-token"];
  const csrfTokenFromRequest = req.headers["x-csrf-token"];

  if (
    typeof csrfTokenFromCookie === "string" &&
    typeof csrfTokenFromRequest === "string" &&
    csrfTokenFromCookie === csrfTokenFromRequest &&
    validateRequest(req)
  ) {
    next();
    return;
  }

  next(invalidCsrfTokenError);
}
