import type { RecommendationItem, Route, Spot } from "../lib/types";

export const tokyoStation = {
  lat: 35.681236,
  lng: 139.767125
};

export const fixtureRoutes: Route[] = [
  {
    id: "route-central-line",
    isProtected: true,
    name: "学校帰り",
    startType: "station",
    startName: "東京駅",
    startLat: 35.681236,
    startLng: 139.767125,
    endType: "station",
    endName: "新宿駅",
    endLat: 35.689592,
    endLng: 139.700413,
    travelMode: "transit",
    viaStationNames: ["神田", "御茶ノ水", "四ツ谷"],
    usualDepartureTime: "18:00",
    usualArrivalTime: "18:35"
  }
];

export const fixtureSpots: Spot[] = [
  {
    id: "spot-cafe",
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
    imageUrl: null,
    description: "テスト用スポット"
  },
  {
    id: "spot-crepe",
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
    imageUrl: null,
    description: "テスト用スポット"
  }
];

const baseBreakdown = {
  behavior: 50,
  route: 92,
  interest: 80,
  time: 90,
  budget: 100,
  mood: 70,
  freshness: 80
};

export const fixtureRecommendations: RecommendationItem[] = fixtureSpots.map((spot, index) => ({
  spot,
  yorimichiScore: [91, 88][index] ?? 70,
  scoreBreakdown: {
    ...baseBreakdown,
    interest: Math.max(45, baseBreakdown.interest - index * 8),
    budget: spot.priceMax === 0 ? 100 : Math.max(55, baseBreakdown.budget - index * 6)
  },
  reasons: [
    index === 0 ? "現在地または登録ルートから近い" : "条件に対してバランスよく一致している",
    spot.priceMax != null ? `予算${spot.priceMax.toLocaleString()}円以内に収まりやすい` : "予算を気にせず寄りやすい",
    `${spot.averageStayMinutes ?? 30}分以内の寄り道にちょうどいい`
  ]
}));
