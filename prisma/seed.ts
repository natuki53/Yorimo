import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const main = async () => {
  await prisma.feedback.deleteMany();
  await prisma.savedSpot.deleteMany();
  await prisma.report.deleteMany();
  await prisma.block.deleteMany();
  await prisma.post.deleteMany();
  await prisma.route.deleteMany();
  await prisma.spotTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.spot.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 12);
  const demoUser = await prisma.user.create({
    data: {
      name: "Yorimo Demo",
      email: "demo@yorimo.local",
      passwordHash,
      ageRange: "20代",
      homeStation: "新宿駅",
      schoolOrWorkStation: "東京駅",
      interests: ["カフェ", "スイーツ", "勉強場所"],
      defaultBudgetMin: 0,
      defaultBudgetMax: 1500
    }
  });

  await prisma.route.create({
    data: {
      userId: demoUser.id,
      name: "中央線ルート",
      startType: "station",
      startName: "東京駅",
      startLat: 35.681236,
      startLng: 139.767125,
      endType: "station",
      endName: "新宿駅",
      endLat: 35.689606,
      endLng: 139.700571,
      travelMode: "transit",
      viaStationNames: ["神田", "御茶ノ水", "四ツ谷"],
      usualDepartureTime: "18:00",
      usualArrivalTime: "18:35"
    }
  });

  console.log("Seed complete: demo user demo@yorimo.local / password123. Spots are loaded from Google Places at runtime.");
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
