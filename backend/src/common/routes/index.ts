import { Router } from "express";
import telemetryRoutes from "../../telemetry/telemetry.routes";
import geoRoutes from "../../geo/geo.routes";
import authRoutes from "../../users/routes/auth.routes";
import { authenticate, authorize } from "../middleware/auth";
import preferencesRoutes from "../../users/routes/preferences.routes";
import userRoutes from "../../users/routes/users.routes";
import roleRoutes from "../../users/routes/roles.routes";
import permissionRoutes from "../../users/routes/permissions.routes";
import flightRoutes from "../../flights/routes/flights.routes";

const apiRouter = Router();

// Health
apiRouter.get("/health", (_req, res) => {
  res.json({ status: "OK", message: "Backend is running" });
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

apiRouter.use("/telemetry", telemetryRoutes);
apiRouter.use("/flights", flightRoutes);
apiRouter.use("/", geoRoutes);

export default apiRouter;
