import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.url(),
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(10),
  JWT_ACCESS_SECRET: z.string().min(20),
  JWT_REFRESH_SECRET: z.string().min(20),
  JWT_ACCESS_EXPIRES: z.string().default("1d"),
  JWT_REFRESH_EXPIRES: z.string().default("7d"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  // REDIS_URL: z.string().optional(),
  // CLOUDINARY_CLOUD_NAME: z.string(),
  // CLOUDINARY_API_KEY: z.string(),
  // CLOUDINARY_API_SECRET: z.string(),
  // SSLC_STORE_ID: z.string(),
  // SSLC_STORE_PASSWORD: z.string(),
  // SSLC_IS_LIVE: z.coerce.boolean().default(false),
  // BACKEND_URL: z.url(),
  FRONTEND_URL: z.url().default("http://localhost:3000"),
});

const config = envSchema.parse(process.env);

export default config;
