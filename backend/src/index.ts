import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { AppDataSource } from "./common/database/data-source";
import { globalErrorHandler } from "./common/middleware/errorHandler";
import apiRouter from "./common/routes";
import { logger } from "./common/utils/logger";
import { doubleCsrfProtection } from "./common/middleware/csrf";

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

// Trust the first hop (Azure Load Balancer / Reverse Proxy)
// Required for express-rate-limit to accurately identify client IPs.
app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
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
    app.listen(port, () => {
      logger.info(`Backend server running on port ${port}`, null, true);
    });
  })
  .catch((err) => {
    logger.fatal("Database connection error:", err);
    process.exit(1);
  });
