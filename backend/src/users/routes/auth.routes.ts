import { Router, Request, Response } from "express";
import { handleHttpError } from "../../common/errors/handle";
import { authRateLimiter } from "../../common/middleware/rateLimiter";
import {
  ACCESS_TOKEN_MAX_AGE_MS,
  REFRESH_TOKEN_MAX_AGE_MS,
  loginUser,
  logoutUser,
  registerUser,
  rotateRefreshToken,
} from "../auth.service";
import { getAppBaseUrl, getMailer } from "../mailer";
import { requestPasswordReset, resetPassword } from "../password-reset.service";

const router = Router();

function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    path: "/",
  });

  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    path: "/api/auth",
  });
}

router.post(
  "/register",
  authRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await registerUser({
        email: req.body.email,
        password: req.body.password,
        nickname: req.body.nickname,
      });
      setAuthCookies(res, result.accessToken, result.rawRefreshToken);
      res.status(201).json({ user: result.user });
    } catch (err: unknown) {
      handleHttpError(err, res);
    }
  },
);

router.post(
  "/login",
  authRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await loginUser({
        email: req.body.email,
        password: req.body.password,
      });
      setAuthCookies(res, result.accessToken, result.rawRefreshToken);
      res.json({ user: result.user });
    } catch (err: unknown) {
      handleHttpError(err, res);
    }
  },
);

router.post("/refresh", async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await rotateRefreshToken(req.cookies?.refresh_token);
    setAuthCookies(res, result.accessToken, result.rawRefreshToken);
    res.json({ user: result.user });
  } catch (err: unknown) {
    handleHttpError(err, res);
  }
});

router.post("/logout", async (req: Request, res: Response): Promise<void> => {
  try {
    await logoutUser(req.cookies?.refresh_token);
    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/api/auth" });
    res.json({ message: "Logged out" });
  } catch (err: unknown) {
    handleHttpError(err, res);
  }
});

router.post(
  "/forgot-password",
  authRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      await requestPasswordReset(req.body.email, getMailer(), getAppBaseUrl());
      res.json({
        message: "If the email exists, a reset link has been sent",
      });
    } catch (err: unknown) {
      handleHttpError(err, res);
    }
  },
);

router.post(
  "/reset-password",
  async (req: Request, res: Response): Promise<void> => {
    try {
      await resetPassword({
        token: req.body.token,
        password: req.body.password,
      });
      res.json({ message: "Password reset successfully" });
    } catch (err: unknown) {
      handleHttpError(err, res);
    }
  },
);

export default router;
