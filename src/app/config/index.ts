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
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  // REDIS_URL: z.string().optional(),

  // Optional so the API boots without them; avatar upload is the only consumer
  // and it fails with a clear error if they are unset.
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // BACKEND_URL: z.url(),
  FRONTEND_URL: z.url().default("http://localhost:3000"),

  // Stripe (test mode). Optional so the server still boots without them;
  // the payment service raises a clear error if they are missing at use time.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // Stripe has no BDT support, so checkout runs in USD for the demo.
  STRIPE_CURRENCY: z.string().default("usd"),
});

const config = envSchema.parse(process.env);

export default config;
