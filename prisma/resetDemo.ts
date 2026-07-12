import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { env } from "../src/config/env.js";
import { applyDemoFixtures } from "./demoFixtures.js";

const prisma = new PrismaClient();

const main = async () => {
  if (!env.DEMO_MODE || !env.ALLOW_DEMO_RESET || !process.argv.includes("--confirm")) {
    throw new Error("Reset refused. DEMO_MODE=true, ALLOW_DEMO_RESET=true and --confirm are required.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.feedback.deleteMany();
    await tx.savedSpot.deleteMany();
    await tx.report.deleteMany();
    await tx.block.deleteMany();
    await tx.post.deleteMany();
    await tx.route.deleteMany();
    await tx.spotTag.deleteMany();
    await tx.tag.deleteMany();
    await tx.spot.deleteMany();
    await tx.user.deleteMany();
    await applyDemoFixtures(tx);
  });

  console.log("Demo data reset complete.");
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
