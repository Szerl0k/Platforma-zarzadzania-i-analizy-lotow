import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.string().optional(),
    CORS_ORIGIN: z.string().optional(),
  })
  .transform((env) => {
    const isProd = env.NODE_ENV === "production";

    if (isProd) {
      if (!env.PORT) {
        throw new Error("CRITICAL: PORT environment variable is required in production");
      }
      if (!env.CORS_ORIGIN) {
        throw new Error("CRITICAL: CORS_ORIGIN environment variable is required in production");
      }
    }

    return {
      NODE_ENV: env.NODE_ENV,
      PORT: isProd ? Number(env.PORT) : Number(env.PORT || "5001"),
      CORS_ORIGIN: isProd ? env.CORS_ORIGIN! : (env.CORS_ORIGIN || "http://localhost:3000"),
    };
  });

export const env = envSchema.parse(process.env);
