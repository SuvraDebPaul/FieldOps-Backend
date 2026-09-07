import { prisma } from "./app/lib/prisma.js";
import { seedDatabase } from "./app/utils/seed.js";

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
