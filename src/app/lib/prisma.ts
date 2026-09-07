import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import env from "../config";

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  max: env.NODE_ENV === "production" ? 5 : 10,
  idleTimeoutMillis: 30_000,

  connectionTimeoutMillis: 15_000,
});

const prisma = new PrismaClient({ adapter });

export { prisma };
