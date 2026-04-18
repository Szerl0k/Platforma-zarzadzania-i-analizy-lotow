import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { AppDataSource } from "./common/database/data-source";
import { globalErrorHandler } from "./common/middleware/errorHandler";
import apiRouter from "./common/routes";

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1", apiRouter);

app.use(globalErrorHandler);

AppDataSource.initialize()
  .then(() => {
    console.log("Database connected successfully via TypeORM");
    app.listen(port, () => {
      console.log(`Backend server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Database connection error:", err);
    process.exit(1);
  });
