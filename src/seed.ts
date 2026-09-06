/**
 * Standalone seed runner: `npm run db:seed`.
 *
 * Local boot seeds automatically via server.ts, but a serverless deployment has
 * no boot step — run this once against the production database after the first
 * `prisma migrate deploy` to create the demo admin, technicians, customers,
 * skills and service categories.
 */
import { prisma } from "./app/lib/prisma";
import { seedDatabase } from "./app/utils/seed";

const main = async () => {
  try {
    await prisma.$connect();
    await seedDatabase();
    console.log("Seed complete.");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

main();
