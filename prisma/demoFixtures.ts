import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Prisma, PrismaClient } from "@prisma/client";
import { DEMO_DEFAULT_ROUTE_ID, DEMO_USER_EMAIL, DEMO_USER_ID } from "../src/config/demo.js";

type DemoDatabase = PrismaClient | Prisma.TransactionClient;
type DemoSpot = Omit<Prisma.SpotUncheckedCreateInput, "id" | "tags"> & {
  id: string;
  tags: string[];
  imageUrl: string;
};

const authors = [
  { id: "fixture-author-mika", name: "みか", email: "fixture-mika@yorimo.local" },
  { id: "fixture-author-ren", name: "れん", email: "fixture-ren@yorimo.local" },
  { id: "fixture-author-aoi", name: "あおい", email: "fixture-aoi@yorimo.local" }
];

const spots: DemoSpot[] = [
  { id: "demo-spot-marunouchi-cafe", name: "丸の内ブックカフェ", category: "カフェ", lat: 35.6827, lng: 139.7647, address: "東京都千代田区丸の内", stationName: "東京駅", priceMin: 700, priceMax: 1500, averageStayMinutes: 40, tags: ["カフェ", "本", "落ち着く", "ひとり"], imageUrl: "/demo-assets/book-cafe.svg", description: "本を選びながら静かに休める、帰り道の小さなカフェ。" },
  { id: "demo-spot-kanda-coffee", name: "神田レトロ喫茶", category: "カフェ", lat: 35.6919, lng: 139.7708, address: "東京都千代田区神田", stationName: "神田駅", priceMin: 500, priceMax: 1200, averageStayMinutes: 35, tags: ["カフェ", "レトロ", "スイーツ"], imageUrl: "/demo-assets/retro-coffee.svg", description: "昔ながらのプリンと深煎りコーヒーを楽しめます。" },
  { id: "demo-spot-ochanomizu-gallery", name: "御茶ノ水ミニギャラリー", category: "ギャラリー", lat: 35.6994, lng: 139.7656, address: "東京都千代田区神田駿河台", stationName: "御茶ノ水駅", priceMin: 0, priceMax: 800, averageStayMinutes: 30, tags: ["アート", "静か", "無料"], imageUrl: "/demo-assets/gallery.svg", description: "若手作家の展示を気軽にのぞける小さなギャラリー。" },
  { id: "demo-spot-kagurazaka-bakery", name: "神楽坂の路地裏ベーカリー", category: "ベーカリー", lat: 35.7028, lng: 139.7392, address: "東京都新宿区神楽坂", stationName: "飯田橋駅", priceMin: 300, priceMax: 1300, averageStayMinutes: 20, tags: ["パン", "テイクアウト", "路地裏"], imageUrl: "/demo-assets/bakery.svg", description: "焼きたての香りに誘われる、寄り道向きの小さなパン屋。" },
  { id: "demo-spot-yotsuya-park", name: "四ツ谷みどりテラス", category: "公園", lat: 35.685, lng: 139.7308, address: "東京都新宿区四谷", stationName: "四ツ谷駅", priceMin: 0, priceMax: 0, averageStayMinutes: 25, tags: ["公園", "散歩", "無料", "リフレッシュ"], imageUrl: "/demo-assets/park.svg", description: "ベンチでひと息つける、駅近くの緑のテラス。" },
  { id: "demo-spot-shinjuku-records", name: "新宿インディーレコード", category: "ショップ", lat: 35.6901, lng: 139.7043, address: "東京都新宿区新宿", stationName: "新宿駅", priceMin: 500, priceMax: 3000, averageStayMinutes: 35, tags: ["音楽", "買い物", "カルチャー"], imageUrl: "/demo-assets/records.svg", description: "試聴しながら新しい音楽に出会えるレコードショップ。" },
  { id: "demo-spot-shinjuku-sweets", name: "西新宿夜カフェ", category: "スイーツ", lat: 35.6924, lng: 139.6974, address: "東京都新宿区西新宿", stationName: "新宿駅", priceMin: 800, priceMax: 1800, averageStayMinutes: 45, tags: ["スイーツ", "夜カフェ", "友達"], imageUrl: "/demo-assets/night-cafe.svg", description: "仕事帰りにも立ち寄れる、季節のパフェが人気の夜カフェ。" },
  { id: "demo-spot-iidabashi-books", name: "飯田橋小さな本棚", category: "書店", lat: 35.701, lng: 139.7467, address: "東京都千代田区飯田橋", stationName: "飯田橋駅", priceMin: 500, priceMax: 2500, averageStayMinutes: 30, tags: ["本", "静か", "ひとり"], imageUrl: "/demo-assets/bookshop.svg", description: "選書にこだわった棚をゆっくり眺められる独立系書店。" }
];

const posts = [
  { id: "fixture-post-cafe", userId: authors[0].id, spotId: spots[0].id, type: "photo" as const, mediaUrl: spots[0].imageUrl, caption: "帰り道に40分だけ読書。静かで落ち着けました。", rating: 5, moodTags: ["落ち着く"] },
  { id: "fixture-post-bakery", userId: authors[1].id, spotId: spots[3].id, type: "photo" as const, mediaUrl: spots[3].imageUrl, caption: "焼きたてのクロワッサンをテイクアウト。", rating: 4, moodTags: ["おいしい"] },
  { id: "fixture-post-reel", userId: authors[2].id, spotId: spots[4].id, type: "short_video" as const, mediaUrl: null, caption: "夕方の風が気持ちいい散歩コース。", rating: 5, moodTags: ["リフレッシュ"] },
  { id: "fixture-post-gallery", userId: authors[0].id, spotId: spots[2].id, type: "review" as const, mediaUrl: null, caption: "無料でさっと見られるのに展示が充実していました。", rating: 4, moodTags: ["アート"] }
];

export const demoFixtureCounts = { users: 4, routes: 1, spots: spots.length, posts: posts.length };

export const applyDemoFixtures = async (db: DemoDatabase) => {
  const unusablePasswordHash = await bcrypt.hash(randomUUID(), 12);

  // Upgrade the legacy email-based demo fixture to deterministic IDs.
  await db.user.deleteMany({
    where: { email: DEMO_USER_EMAIL, id: { not: DEMO_USER_ID } }
  });

  await db.user.upsert({
    where: { id: DEMO_USER_ID },
    update: { name: "Yorimo Demo", email: DEMO_USER_EMAIL, ageRange: "20代", homeStation: "新宿駅", schoolOrWorkStation: "東京駅", interests: ["カフェ", "スイーツ", "散歩"], defaultBudgetMin: 0, defaultBudgetMax: 1500 },
    create: { id: DEMO_USER_ID, name: "Yorimo Demo", email: DEMO_USER_EMAIL, passwordHash: unusablePasswordHash, ageRange: "20代", homeStation: "新宿駅", schoolOrWorkStation: "東京駅", interests: ["カフェ", "スイーツ", "散歩"], defaultBudgetMin: 0, defaultBudgetMax: 1500 }
  });

  for (const author of authors) {
    await db.user.upsert({ where: { id: author.id }, update: { name: author.name, email: author.email }, create: { ...author, passwordHash: unusablePasswordHash, interests: [] } });
  }

  await db.route.upsert({
    where: { id: DEMO_DEFAULT_ROUTE_ID },
    update: { userId: DEMO_USER_ID, name: "東京駅から新宿駅", startType: "station", startName: "東京駅", startLat: 35.681236, startLng: 139.767125, endType: "station", endName: "新宿駅", endLat: 35.689606, endLng: 139.700571, travelMode: "transit", viaStationNames: ["神田", "御茶ノ水", "四ツ谷"], usualDepartureTime: "18:00", usualArrivalTime: "18:35" },
    create: { id: DEMO_DEFAULT_ROUTE_ID, userId: DEMO_USER_ID, name: "東京駅から新宿駅", startType: "station", startName: "東京駅", startLat: 35.681236, startLng: 139.767125, endType: "station", endName: "新宿駅", endLat: 35.689606, endLng: 139.700571, travelMode: "transit", viaStationNames: ["神田", "御茶ノ水", "四ツ谷"], usualDepartureTime: "18:00", usualArrivalTime: "18:35" }
  });

  for (const spot of spots) {
    await db.spot.upsert({ where: { id: spot.id }, update: spot, create: spot });
    for (const tagName of spot.tags) {
      const tag = await db.tag.upsert({ where: { name: tagName }, update: {}, create: { name: tagName, category: spot.category } });
      await db.spotTag.upsert({ where: { spotId_tagId: { spotId: spot.id, tagId: tag.id } }, update: {}, create: { spotId: spot.id, tagId: tag.id } });
    }
  }

  for (const post of posts) {
    await db.post.upsert({
      where: { id: post.id },
      update: { ...post, visibility: "public" },
      create: { ...post, visibility: "public" }
    });
  }

  await db.savedSpot.upsert({
    where: { userId_spotId: { userId: DEMO_USER_ID, spotId: spots[0].id } },
    update: {},
    create: { userId: DEMO_USER_ID, spotId: spots[0].id }
  });
  await db.feedback.upsert({
    where: { id: "fixture-feedback-save" },
    update: { userId: DEMO_USER_ID, spotId: spots[0].id, action: "save" },
    create: { id: "fixture-feedback-save", userId: DEMO_USER_ID, spotId: spots[0].id, action: "save" }
  });
};
