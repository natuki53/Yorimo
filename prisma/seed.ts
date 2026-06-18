import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const spots = [
  {
    name: "東京駅前ブックカフェ",
    category: "カフェ",
    lat: 35.6815,
    lng: 139.7681,
    stationName: "東京",
    address: "東京都千代田区丸の内1-1",
    priceMin: 600,
    priceMax: 1400,
    averageStayMinutes: 45,
    tags: ["カフェ", "勉強場所", "静かな場所"],
    imageUrl: "https://picsum.photos/seed/yorimo-cafe-book/800/600",
    description: "本を読みながら落ち着いて過ごせる駅近カフェ。電源席もあります。"
  },
  {
    name: "駅前クレープ",
    category: "スイーツ",
    lat: 35.6809,
    lng: 139.7669,
    stationName: "東京",
    address: "東京都千代田区丸の内1-2",
    priceMin: 500,
    priceMax: 1000,
    averageStayMinutes: 25,
    tags: ["スイーツ", "カフェ", "友達と行ける場所"],
    imageUrl: "https://picsum.photos/seed/yorimo-crepe/800/600",
    description: "季節のフルーツを使ったクレープが人気の小さなお店。"
  },
  {
    name: "神田こってりラーメン",
    category: "ラーメン",
    lat: 35.6917,
    lng: 139.7709,
    stationName: "神田",
    address: "東京都千代田区鍛冶町1-4",
    priceMin: 850,
    priceMax: 1300,
    averageStayMinutes: 30,
    tags: ["ラーメン", "一人で行ける場所"],
    imageUrl: "https://picsum.photos/seed/yorimo-ramen-kanda/800/600",
    description: "短時間で満足できる濃厚スープのラーメン店。"
  },
  {
    name: "有楽町ミニシネマ",
    category: "映画",
    lat: 35.6749,
    lng: 139.7638,
    stationName: "有楽町",
    address: "東京都千代田区有楽町2-5",
    priceMin: 1200,
    priceMax: 2200,
    averageStayMinutes: 120,
    tags: ["映画", "雨の日", "友達と行ける場所"],
    imageUrl: "https://picsum.photos/seed/yorimo-cinema/800/600",
    description: "学校帰りや仕事帰りに寄りやすい小規模映画館。"
  },
  {
    name: "銀座サウナラウンジ",
    category: "サウナ",
    lat: 35.6718,
    lng: 139.7652,
    stationName: "銀座",
    address: "東京都中央区銀座3-2",
    priceMin: 1800,
    priceMax: 3200,
    averageStayMinutes: 90,
    tags: ["サウナ", "静かな場所", "一人で行ける場所"],
    imageUrl: "https://picsum.photos/seed/yorimo-sauna-ginza/800/600",
    description: "短時間でも整いやすい都心型サウナ。"
  },
  {
    name: "日比谷リラックスパーク",
    category: "公園",
    lat: 35.6739,
    lng: 139.7555,
    stationName: "日比谷",
    address: "東京都千代田区日比谷公園",
    priceMin: 0,
    priceMax: 0,
    averageStayMinutes: 30,
    tags: ["公園", "静かな場所", "無料"],
    imageUrl: "https://picsum.photos/seed/yorimo-park-hibiya/800/600",
    description: "ベンチで一息つける都心の緑地。"
  },
  {
    name: "新宿ワークカフェ",
    category: "勉強場所",
    lat: 35.6901,
    lng: 139.7002,
    stationName: "新宿",
    address: "東京都新宿区西新宿1-3",
    priceMin: 700,
    priceMax: 1600,
    averageStayMinutes: 60,
    tags: ["勉強場所", "カフェ", "静かな場所"],
    imageUrl: "https://picsum.photos/seed/yorimo-work-cafe/800/600",
    description: "集中しやすいカウンター席が多いカフェ。"
  },
  {
    name: "新宿ナイトジム",
    category: "ジム",
    lat: 35.692,
    lng: 139.699,
    stationName: "新宿",
    address: "東京都新宿区西新宿1-8",
    priceMin: 1000,
    priceMax: 2500,
    averageStayMinutes: 75,
    tags: ["ジム", "一人で行ける場所", "夜も開いている"],
    imageUrl: "https://picsum.photos/seed/yorimo-gym-shinjuku/800/600",
    description: "ウェアレンタルがあり手ぶらで寄れるジム。"
  },
  {
    name: "新宿中古スニーカー店",
    category: "古着",
    lat: 35.6932,
    lng: 139.7034,
    stationName: "新宿",
    address: "東京都新宿区新宿3-12",
    priceMin: 1000,
    priceMax: 12000,
    averageStayMinutes: 35,
    tags: ["古着", "買い物", "友達と行ける場所"],
    imageUrl: "https://picsum.photos/seed/yorimo-sneaker/800/600",
    description: "一点物のスニーカーや古着を探せるショップ。"
  },
  {
    name: "渋谷スイーツスタンド",
    category: "スイーツ",
    lat: 35.6594,
    lng: 139.7005,
    stationName: "渋谷",
    address: "東京都渋谷区道玄坂1-1",
    priceMin: 450,
    priceMax: 1200,
    averageStayMinutes: 20,
    tags: ["スイーツ", "友達と行ける場所", "写真映え"],
    imageUrl: "https://picsum.photos/seed/yorimo-shibuya-sweets/800/600",
    description: "短い空き時間でも寄りやすいテイクアウトスイーツ店。"
  },
  {
    name: "渋谷ルーフトップカフェ",
    category: "カフェ",
    lat: 35.6605,
    lng: 139.7018,
    stationName: "渋谷",
    address: "東京都渋谷区渋谷2-21",
    priceMin: 900,
    priceMax: 2000,
    averageStayMinutes: 50,
    tags: ["カフェ", "友達と行ける場所", "写真映え"],
    imageUrl: "https://picsum.photos/seed/yorimo-rooftop/800/600",
    description: "眺めの良いテラス席で軽く休憩できるカフェ。"
  },
  {
    name: "表参道ヴィンテージルーム",
    category: "古着",
    lat: 35.6652,
    lng: 139.7123,
    stationName: "表参道",
    address: "東京都渋谷区神宮前4-2",
    priceMin: 1500,
    priceMax: 18000,
    averageStayMinutes: 45,
    tags: ["古着", "買い物", "静かな場所"],
    imageUrl: "https://picsum.photos/seed/yorimo-vintage/800/600",
    description: "落ち着いた店内で古着をじっくり見られるショップ。"
  },
  {
    name: "原宿ポップコーンシアター",
    category: "映画",
    lat: 35.671,
    lng: 139.7048,
    stationName: "原宿",
    address: "東京都渋谷区神宮前1-8",
    priceMin: 1300,
    priceMax: 2300,
    averageStayMinutes: 110,
    tags: ["映画", "友達と行ける場所", "雨の日"],
    imageUrl: "https://picsum.photos/seed/yorimo-harajuku-cinema/800/600",
    description: "ショートフィルム特集が多いカジュアルな映画スポット。"
  },
  {
    name: "池袋まぜそば研究所",
    category: "ラーメン",
    lat: 35.7303,
    lng: 139.7112,
    stationName: "池袋",
    address: "東京都豊島区南池袋1-20",
    priceMin: 850,
    priceMax: 1400,
    averageStayMinutes: 30,
    tags: ["ラーメン", "一人で行ける場所", "夜も開いている"],
    imageUrl: "https://picsum.photos/seed/yorimo-mazesoba/800/600",
    description: "自分好みにトッピングできるまぜそば店。"
  },
  {
    name: "池袋アニメ雑貨モール",
    category: "買い物",
    lat: 35.7291,
    lng: 139.716,
    stationName: "池袋",
    address: "東京都豊島区東池袋1-12",
    priceMin: 500,
    priceMax: 8000,
    averageStayMinutes: 60,
    tags: ["買い物", "友達と行ける場所", "趣味"],
    imageUrl: "https://picsum.photos/seed/yorimo-anime-mall/800/600",
    description: "推し活グッズを探しやすい駅近モール。"
  },
  {
    name: "上野静音ラウンジ",
    category: "勉強場所",
    lat: 35.7137,
    lng: 139.7772,
    stationName: "上野",
    address: "東京都台東区上野7-3",
    priceMin: 500,
    priceMax: 1500,
    averageStayMinutes: 70,
    tags: ["勉強場所", "静かな場所", "一人で行ける場所"],
    imageUrl: "https://picsum.photos/seed/yorimo-ueno-study/800/600",
    description: "会話少なめで集中できるラウンジ型スペース。"
  },
  {
    name: "上野クラシック喫茶",
    category: "カフェ",
    lat: 35.7119,
    lng: 139.7745,
    stationName: "上野",
    address: "東京都台東区上野6-8",
    priceMin: 650,
    priceMax: 1300,
    averageStayMinutes: 45,
    tags: ["カフェ", "静かな場所", "レトロ"],
    imageUrl: "https://picsum.photos/seed/yorimo-retro-cafe/800/600",
    description: "昔ながらのプリンとコーヒーが楽しめる喫茶店。"
  },
  {
    name: "中目黒リバーサイド公園",
    category: "公園",
    lat: 35.6439,
    lng: 139.699,
    stationName: "中目黒",
    address: "東京都目黒区上目黒1-25",
    priceMin: 0,
    priceMax: 0,
    averageStayMinutes: 35,
    tags: ["公園", "無料", "散歩"],
    imageUrl: "https://picsum.photos/seed/yorimo-nakame-park/800/600",
    description: "川沿いを歩いて気分転換できるスポット。"
  },
  {
    name: "代官山セレクトショップ",
    category: "買い物",
    lat: 35.6482,
    lng: 139.7031,
    stationName: "代官山",
    address: "東京都渋谷区代官山町16",
    priceMin: 1200,
    priceMax: 20000,
    averageStayMinutes: 45,
    tags: ["買い物", "古着", "静かな場所"],
    imageUrl: "https://picsum.photos/seed/yorimo-daikanyama-shop/800/600",
    description: "雑貨と服を一緒に見られる寄り道向きショップ。"
  },
  {
    name: "恵比寿コンパクトサウナ",
    category: "サウナ",
    lat: 35.6467,
    lng: 139.7101,
    stationName: "恵比寿",
    address: "東京都渋谷区恵比寿南1-5",
    priceMin: 1600,
    priceMax: 2800,
    averageStayMinutes: 75,
    tags: ["サウナ", "一人で行ける場所", "夜も開いている"],
    imageUrl: "https://picsum.photos/seed/yorimo-ebisu-sauna/800/600",
    description: "短時間利用プランがあるコンパクトなサウナ。"
  }
];

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
      ageRange: "18-22",
      homeStation: "新宿",
      schoolOrWorkStation: "東京",
      interests: ["カフェ", "スイーツ", "勉強場所"],
      defaultBudgetMin: 0,
      defaultBudgetMax: 1500
    }
  });

  await prisma.route.create({
    data: {
      userId: demoUser.id,
      name: "学校帰りの中央線ルート",
      startName: "東京駅",
      startLat: 35.681236,
      startLng: 139.767125,
      endName: "新宿駅",
      endLat: 35.689592,
      endLng: 139.700413,
      viaStationNames: ["神田", "御茶ノ水", "四ツ谷"],
      usualDepartureTime: "18:00",
      usualArrivalTime: "18:35"
    }
  });

  const createdSpots = [];
  for (const spotSeed of spots) {
    const spot = await prisma.spot.create({
      data: {
        ...spotSeed,
        openingHours: "10:00-22:00"
      }
    });
    createdSpots.push(spot);

    for (const tagName of spotSeed.tags) {
      const tag = await prisma.tag.upsert({
        where: { name: tagName },
        update: { category: spotSeed.category },
        create: { name: tagName, category: spotSeed.category }
      });

      await prisma.spotTag.create({
        data: {
          spotId: spot.id,
          tagId: tag.id
        }
      });
    }
  }

  const cafeSpot = createdSpots[0];
  const sweetsSpot = createdSpots[1];

  await prisma.savedSpot.create({
    data: {
      userId: demoUser.id,
      spotId: sweetsSpot.id
    }
  });

  await prisma.feedback.createMany({
    data: [
      { userId: demoUser.id, spotId: cafeSpot.id, action: "visited" },
      { userId: demoUser.id, spotId: sweetsSpot.id, action: "save" },
      { userId: demoUser.id, spotId: sweetsSpot.id, action: "like" }
    ]
  });

  await prisma.post.create({
    data: {
      userId: demoUser.id,
      spotId: sweetsSpot.id,
      type: "review",
      caption: "帰り道にちょうどいい甘さでした。",
      rating: 5,
      moodTags: ["甘いもの", "友達と行ける場所"],
      crowdLevel: "normal",
      stayMinutes: 25,
      budgetUsed: 800,
      visibility: "public"
    }
  });

  console.log(`Seed complete: ${createdSpots.length} spots, demo user demo@yorimo.local / password123`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
