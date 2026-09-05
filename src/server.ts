import app from "./app";
import config from "./app/config";
import { prisma } from "./app/lib/prisma";
import { seedDatabase } from "./app/utils/seed";

const PORT = config.PORT;
const main = async () => {
  try {
    await prisma.$connect();
    console.log("Database Connected Successfully");
    await seedDatabase();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting the server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

main();
