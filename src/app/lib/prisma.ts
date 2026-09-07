import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import env from "../config";

/**
 * Explicit pool sizing.
 *
 * The pg default of 10 connections per process is too many for a serverless
 * deployment (every warm lambda holds its own pool) and too many when more than
 * one dev server runs against the same Neon database. Keeping the number small
 * is what prevents "Unable to start a transaction in the given time" under
 * contention.
 */
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  max: env.NODE_ENV === "production" ? 5 : 10,
  idleTimeoutMillis: 30_000,
  // Neon is a network hop away; the pg default gives up too eagerly.
  connectionTimeoutMillis: 15_000,
});

const prisma = new PrismaClient({ adapter });

export { prisma };
