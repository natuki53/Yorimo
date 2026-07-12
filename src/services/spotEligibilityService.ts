import type { Spot } from "@prisma/client";

type RecommendableSpot = Pick<Spot, "category" | "name" | "tags">;

const excludedPlaceKeywords = [
  "病院",
  "医院",
  "医療",
  "クリニック",
  "診療所",
  "内科",
  "外科",
  "小児科",
  "眼科",
  "耳鼻",
  "皮膚科",
  "整形",
  "歯科",
  "薬局",
  "調剤",
  "ドラッグストア",
  "ガソリンスタンド",
  "給油所",
  "サービスステーション",
  "セルフスタンド",
  "自動車販売",
  "中古車",
  "車検",
  "整備工場",
  "レンタカー",
  "カーシェア",
  "洗車",
  "タイヤ",
  "ロードサービス",
  "スーパー",
  "スーパーマーケット",
  "食料品店",
  "大学",
  "学校",
  "高校",
  "中学校",
  "小学校",
  "幼稚園",
  "保育園",
  "輸送",
  "運送",
  "物流",
  "営業所",
  "配送",
  "駐車場",
  "駅",
  "バス停",
  "警察",
  "消防",
  "役所",
  "市役所",
  "区役所",
  "町役場",
  "郵便局",
  "銀行",
  "ATM",
  "保険",
  "不動産",
  "法律事務所",
  "弁護士",
  "会計事務所",
  "税理士",
  "ホテル",
  "旅館",
  "宿泊",
  "墓地",
  "葬儀",
  "葬祭",
  "hospital",
  "medical",
  "clinic",
  "doctor",
  "dentist",
  "pharmacy",
  "drugstore",
  "gasstation",
  "servicestation",
  "carrepair",
  "carrental",
  "cardealer",
  "carwash",
  "evcharging",
  "supermarket",
  "grocery",
  "school",
  "university",
  "parking",
  "police",
  "firestation",
  "cityhall",
  "postoffice",
  "bank",
  "atm",
  "insurance",
  "realestate",
  "lawyer",
  "accounting",
  "hotel",
  "lodging",
  "motel",
  "cemetery",
  "funeral"
];

const excludedGooglePlaceTypes = new Set([
  "bus_station",
  "bus_stop",
  "city_hall",
  "courthouse",
  "dental_clinic",
  "dentist",
  "doctor",
  "drugstore",
  "electric_vehicle_charging_station",
  "embassy",
  "fire_station",
  "gas_station",
  "grocery_store",
  "hospital",
  "insurance_agency",
  "light_rail_station",
  "local_government_office",
  "lodging",
  "medical_lab",
  "parking",
  "pharmacy",
  "physiotherapist",
  "police",
  "post_office",
  "real_estate_agency",
  "preschool",
  "primary_school",
  "school",
  "secondary_school",
  "subway_station",
  "supermarket",
  "train_station",
  "transit_station",
  "university",
  "veterinary_care",
  "accounting",
  "airport",
  "atm",
  "bank",
  "car_dealer",
  "car_rental",
  "car_repair",
  "car_wash",
  "cemetery",
  "funeral_home",
  "lawyer",
  "moving_company",
  "rv_park",
  "storage",
  "taxi_stand",
  "travel_agency"
]);

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase("ja-JP")
    .replace(/\s+/g, "");

const normalizedExcludedPlaceKeywords = excludedPlaceKeywords.map(normalizeSearchText);

export const hasExcludedGooglePlaceType = (types: string[] = []) =>
  types.some((type) => excludedGooglePlaceTypes.has(type));

export const hasExcludedPlaceKeyword = (values: Array<string | null | undefined>) => {
  const searchable = normalizeSearchText(values.filter((value): value is string => Boolean(value)).join(" "));
  return normalizedExcludedPlaceKeywords.some((keyword) => searchable.includes(keyword));
};

export const isRecommendablePlaceCandidate = (input: {
  name?: string | null;
  category?: string | null;
  tags?: string[];
  types?: string[];
}) => {
  if (hasExcludedGooglePlaceType(input.types)) {
    return false;
  }

  return !hasExcludedPlaceKeyword([input.name, input.category, ...(input.tags ?? [])]);
};

export const isRecommendableSpot = (spot: RecommendableSpot) =>
  isRecommendablePlaceCandidate({
    category: spot.category,
    name: spot.name,
    tags: spot.tags
  });
