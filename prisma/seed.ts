import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { applyDemoFixtures } from "./demoFixtures.js";

const prisma = new PrismaClient();

applyDemoFixtures(prisma)
  .then(() => console.log("Demo fixtures are ready."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
