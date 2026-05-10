import { Router, Request, Response } from "express";
import telemetryRoutes from "../../telemetry/telemetry.routes";
import geoRoutes from "../../geo/geo.routes";
import authRoutes from "../../users/routes/auth.routes";
import { authenticate, authorize } from "../middleware/auth";
import preferencesRoutes from "../../users/routes/preferences.routes";
import userRoutes from "../../users/routes/users.routes";
import roleRoutes from "../../users/routes/roles.routes";
import permissionRoutes from "../../users/routes/permissions.routes";
import flightRoutes from "../../flights/flights.routes";
import cityBreakRoutes from "../../city-break/city-break.routes";
import favoritesRoutes from "../../tracking/favorites.routes";
import trackingRoutes, {
  notificationsRouter,
} from "../../tracking/tracking.routes";
import statsRoutes from "../../stats/stats.routes";
import rankingsRoutes from "../../stats/rankings.routes";
import apiUsageRoutes from "../integrations/usage/usage.routes";
import { generateCsrfToken } from "../middleware/csrf";
import { apiRateLimiter } from "../middleware/rateLimiter";

const apiRouter = Router();

// Health
apiRouter.get("/health", (_req, res) => {
  res.json({ status: "OK", message: "Backend is running" });
});

// CSRF token endpoint — client must call this before any state-changing request
apiRouter.get("/csrf-token", (req: Request, res: Response) => {
  res.json({ csrfToken: generateCsrfToken(req, res) });
});

// Public routes
apiRouter.use("/auth", authRoutes);

// Protected routes
apiRouter.use("/users/me/preferences", authenticate, preferencesRoutes);
apiRouter.use("/users", authenticate, userRoutes);

// Admin routes
apiRouter.use("/roles", authenticate, authorize("roles:write"), roleRoutes);
apiRouter.use(
  "/permissions",
  authenticate,
  authorize("permissions:write"),
  permissionRoutes,
);
apiRouter.use(
  "/admin/api-usage",
  apiRateLimiter,
  authenticate,
  authorize("api-usage:read"),
  apiUsageRoutes,
);

apiRouter.use("/telemetry", telemetryRoutes);
apiRouter.use("/flights", flightRoutes);
apiRouter.use("/city-break", cityBreakRoutes);
apiRouter.use("/favorites", apiRateLimiter, authenticate, favoritesRoutes);
apiRouter.use("/tracking", apiRateLimiter, authenticate, trackingRoutes);
apiRouter.use(
  "/notifications",
  apiRateLimiter,
  authenticate,
  notificationsRouter,
);
apiRouter.use("/stats", apiRateLimiter, authenticate, statsRoutes);
apiRouter.use("/rankings", rankingsRoutes);
apiRouter.use("/", geoRoutes);

export default apiRouter;
