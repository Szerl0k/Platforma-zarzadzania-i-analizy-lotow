import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { AppDataSource } from "./common/database/data-source";
import { globalErrorHandler } from "./common/middleware/errorHandler";
import apiRouter from "./common/routes";
import { logger } from "./common/utils/logger";
import { doubleCsrfProtection } from "./common/middleware/csrf";
import { getTrackingScheduler } from "./tracking/tracking.scheduler";
import { env } from "./config/env";

const app = express();
const port = env.PORT;

// Trust the first hop (Azure Load Balancer / Reverse Proxy)
// Required for express-rate-limit to accurately identify client IPs.
app.set("trust proxy", 1);

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(doubleCsrfProtection);

app.use("/api/v1", apiRouter);

app.use(globalErrorHandler);

AppDataSource.initialize()
  .then(() => {
    logger.info("Database connected successfully via TypeORM", null, true);
    getTrackingScheduler().start();
    app.listen(port, () => {
      logger.info(`Backend server running on port ${port}`, null, true);
    });
  })
  .catch((err) => {
    logger.fatal("Database connection error:", err);
    process.exit(1);
  });
