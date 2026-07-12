import type { Prisma, Spot } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../utils/prisma.js";
import { isRecommendablePlaceCandidate } from "./spotEligibilityService.js";
import { normalizeTags, syncSpotTags } from "./tagService.js";
import { createSingleFlight } from "../utils/singleFlight.js";

type NearbyPlacesInput = {
  lat: number;
  lng: number;
  radiusKm?: number;
  limit?: number;
};

type StationSearchInput = {
  keyword: string;
  lat?: number;
  lng?: number;
  limit?: number;
};

export type StationCandidate = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  primaryType: string | null;
  types: string[];
};

type GoogleLocalizedText = {
  text?: string;
  languageCode?: string;
};

type GooglePlace = {
  businessStatus?: string;
  displayName?: GoogleLocalizedText;
  formattedAddress?: string;
  id?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  primaryType?: string;
  primaryTypeDisplayName?: GoogleLocalizedText;
  photos?: Array<{
    name?: string;
    widthPx?: number;
    heightPx?: number;
  }>;
  types?: string[];
};

type GoogleNearbyResponse = {
  places?: GooglePlace[];
};

type GooglePlacePhotoResponse = {
  photoUri?: string;
};

const nearbySearchUrl = "https://places.googleapis.com/v1/places:searchNearby";
const textSearchUrl = "https://places.googleapis.com/v1/places:searchText";
const runNearbyRequest = createSingleFlight<string, Spot[]>();
const fieldMask = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.primaryType",
  "places.primaryTypeDisplayName",
  "places.types",
  "places.businessStatus",
  "places.photos"
].join(",");
const stationFieldMask = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.primaryType",
  "places.types"
].join(",");
const stationTypes = ["train_station", "subway_station", "transit_station", "light_rail_station"];
const demoStations: StationCandidate[] = [
  { id: "demo-station-tokyo", name: "東京駅", address: "東京都千代田区丸の内", lat: 35.681236, lng: 139.767125, primaryType: "train_station", types: ["train_station", "transit_station"] },
  { id: "demo-station-kanda", name: "神田駅", address: "東京都千代田区鍛冶町", lat: 35.69169, lng: 139.770883, primaryType: "train_station", types: ["train_station", "transit_station"] },
  { id: "demo-station-ochanomizu", name: "御茶ノ水駅", address: "東京都千代田区神田駿河台", lat: 35.699605, lng: 139.765164, primaryType: "train_station", types: ["train_station", "transit_station"] },
  { id: "demo-station-yotsuya", name: "四ツ谷駅", address: "東京都新宿区四谷", lat: 35.686014, lng: 139.730667, primaryType: "train_station", types: ["train_station", "transit_station"] },
  { id: "demo-station-shinjuku", name: "新宿駅", address: "東京都新宿区新宿", lat: 35.689606, lng: 139.700571, primaryType: "train_station", types: ["train_station", "transit_station"] }
];

const typeLabels: Record<string, string> = {
  amusement_park: "レジャー",
  art_gallery: "ギャラリー",
  bakery: "ベーカリー",
  bar: "バー",
  beauty_salon: "美容",
  book_store: "書店",
  cafe: "カフェ",
  clothing_store: "買い物",
  convenience_store: "コンビニ",
  department_store: "百貨店",
  electronics_store: "買い物",
  food: "グルメ",
  gym: "ジム",
  library: "図書館",
  meal_takeaway: "テイクアウト",
  movie_theater: "映画館",
  museum: "ミュージアム",
  park: "公園",
  restaurant: "レストラン",
  shopping_mall: "買い物",
  spa: "リラクゼーション",
  store: "買い物",
  supermarket: "スーパー",
  tourist_attraction: "観光"
};

const nonSpotTypes = new Set([
  "administrative_area_level_1",
  "administrative_area_level_2",
  "country",
  "establishment",
  "floor",
  "geocode",
  "intersection",
  "locality",
  "natural_feature",
  "neighborhood",
  "political",
  "postal_code",
  "premise",
  "route",
  "street_address",
  "sublocality",
  "sublocality_level_1"
]);

const isConfigured = () => Boolean(env.GOOGLE_MAPS_SERVER_API_KEY);

const warnPlaces = (message: string, error?: unknown) => {
  if (env.NODE_ENV === "test") {
    return;
  }
  console.warn(`[google-places] ${message}`, error instanceof Error ? error.message : "");
};

const clampRadiusMeters = (radiusKm?: number) => {
  const radiusMeters = Math.round((radiusKm ?? 3) * 1000);
  return Math.max(100, Math.min(50_000, radiusMeters));
};

const normalizePlaceName = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, "")
    .replace(/[()（）]/g, "")
    .replace(/駅$/, "")
    .toLocaleLowerCase("ja-JP");

const searchDemoStations = (keyword: string, limit: number) => {
  const normalized = normalizePlaceName(keyword);
  return demoStations
    .filter((station) => {
      const stationName = normalizePlaceName(station.name);
      return stationName.includes(normalized) || normalized.includes(stationName);
    })
    .slice(0, Math.max(1, Math.min(limit, 8)));
};

const pickCategory = (place: GooglePlace) => {
  const display = place.primaryTypeDisplayName?.text?.trim();
  if (display) {
    return display;
  }

  const mapped = place.types?.map((type) => typeLabels[type]).find(Boolean);
  return mapped ?? "スポット";
};

const pickStayMinutes = (place: GooglePlace) => {
  const types = new Set(place.types ?? []);
  if (types.has("movie_theater")) return 120;
  if (types.has("gym") || types.has("spa")) return 60;
  if (types.has("restaurant") || types.has("cafe") || types.has("bar")) return 45;
  if (types.has("park") || types.has("museum") || types.has("tourist_attraction")) return 40;
  return 25;
};

const isUsablePlace = (place: GooglePlace) => {
  const name = place.displayName?.text?.trim();
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  const types = place.types ?? [];

  if (!name || lat == null || lng == null) {
    return false;
  }

  if (place.businessStatus && place.businessStatus !== "OPERATIONAL") {
    return false;
  }

  if (
    !isRecommendablePlaceCandidate({
      category: place.primaryTypeDisplayName?.text,
      name,
      types
    })
  ) {
    return false;
  }

  return types.some((type) => Boolean(typeLabels[type]));
};

const toPhotoProxyUrl = (place: GooglePlace) => {
  const photoName = place.photos?.find((photo) => photo.name)?.name;
  if (!photoName) {
    return null;
  }

  return `/api/place-photos/${Buffer.from(photoName, "utf8").toString("base64url")}`;
};

const toSpotData = (place: GooglePlace): Prisma.SpotCreateInput | null => {
  if (!isUsablePlace(place)) {
    return null;
  }

  const name = place.displayName!.text!.trim();
  const lat = place.location!.latitude!;
  const lng = place.location!.longitude!;
  const category = pickCategory(place);
  const typeTags = (place.types ?? []).map((type) => typeLabels[type] ?? type).filter(Boolean);
  const tags = normalizeTags([category, "実店舗", ...typeTags]).slice(0, 8);

  return {
    address: place.formattedAddress?.trim() || null,
    averageStayMinutes: pickStayMinutes(place),
    category,
    description: "Google Placesから取得した実店舗です。",
    imageUrl: toPhotoProxyUrl(place),
    lat,
    lng,
    name,
    openingHours: null,
    priceMax: null,
    priceMin: null,
    stationName: null,
    tags
  };
};

const findDuplicateSpot = (data: Prisma.SpotCreateInput) => {
  const range = 0.00008;
  const clauses: Prisma.SpotWhereInput[] = [
    {
      name: data.name,
      lat: { gte: data.lat - range, lte: data.lat + range },
      lng: { gte: data.lng - range, lte: data.lng + range }
    }
  ];

  if (data.address) {
    clauses.unshift({
      name: data.name,
      address: data.address
    });
  }

  return prisma.spot.findFirst({ where: { OR: clauses } });
};

const savePlaceAsSpot = async (data: Prisma.SpotCreateInput) => {
  const existing = await findDuplicateSpot(data);
  const spot = existing
    ? await prisma.spot.update({
        where: { id: existing.id },
        data: {
          address: data.address,
          averageStayMinutes: data.averageStayMinutes,
          category: data.category,
          description: data.description,
          imageUrl: data.imageUrl,
          lat: data.lat,
          lng: data.lng,
          name: data.name,
          tags: data.tags
        }
      })
    : await prisma.spot.create({ data });

  await syncSpotTags(spot.id, spot.tags, spot.category);
  return spot;
};

export const getPlacePhotoUri = async (photoName: string, maxWidthPx = 720) => {
  if (!isConfigured() || !photoName.startsWith("places/")) {
    return null;
  }

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?${new URLSearchParams({
        key: env.GOOGLE_MAPS_SERVER_API_KEY!,
        maxWidthPx: String(Math.max(1, Math.min(1600, maxWidthPx))),
        skipHttpRedirect: "true"
      }).toString()}`,
      { signal: AbortSignal.timeout(2500) }
    );

    if (!response.ok) {
      warnPlaces(`Place Photo failed with ${response.status}`);
      return null;
    }

    const payload = (await response.json()) as GooglePlacePhotoResponse;
    return payload.photoUri ?? null;
  } catch (error) {
    warnPlaces("Place Photo request failed", error);
    return null;
  }
};

const syncNearbyPlacesRequest = async ({ lat, lng, radiusKm, limit = 20 }: NearbyPlacesInput): Promise<Spot[]> => {
  if (!isConfigured()) {
    return [];
  }

  try {
    const response = await fetch(nearbySearchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": env.GOOGLE_MAPS_SERVER_API_KEY!,
        "X-Goog-FieldMask": fieldMask
      },
      body: JSON.stringify({
        languageCode: "ja",
        locationRestriction: {
          circle: {
            center: {
              latitude: lat,
              longitude: lng
            },
            radius: clampRadiusMeters(radiusKm)
          }
        },
        maxResultCount: Math.max(1, Math.min(20, limit)),
        rankPreference: "POPULARITY",
        regionCode: "JP"
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      warnPlaces(`Nearby Search failed with ${response.status}`);
      return [];
    }

    const payload = (await response.json()) as GoogleNearbyResponse;
    const data = (payload.places ?? []).map(toSpotData).filter((spot): spot is Prisma.SpotCreateInput => Boolean(spot));
    const saved: Spot[] = [];

    for (const spotData of data) {
      saved.push(await savePlaceAsSpot(spotData));
    }

    return saved;
  } catch (error) {
    warnPlaces("Nearby Search request failed", error);
    return [];
  }
};

const nearbyRequestKey = ({ lat, lng, radiusKm, limit = 20 }: NearbyPlacesInput) =>
  [lat.toFixed(5), lng.toFixed(5), clampRadiusMeters(radiusKm), Math.max(1, Math.min(20, limit))].join(":");

export const syncNearbyPlaces = (input: NearbyPlacesInput): Promise<Spot[]> => {
  const key = nearbyRequestKey(input);
  return runNearbyRequest(key, () => syncNearbyPlacesRequest(input));
};

const toStationCandidate = (place: GooglePlace): StationCandidate | null => {
  const name = place.displayName?.text?.trim();
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;

  if (!place.id || !name || lat == null || lng == null) {
    return null;
  }

  const types = place.types ?? [];
  if (!types.some((type) => stationTypes.includes(type))) {
    return null;
  }

  return {
    address: place.formattedAddress?.trim() || null,
    id: place.id,
    lat,
    lng,
    name,
    primaryType: place.primaryType ?? null,
    types
  };
};

const scoreStationCandidate = (candidate: StationCandidate, keyword: string) => {
  const normalizedName = normalizePlaceName(candidate.name);
  const normalizedKeyword = normalizePlaceName(keyword);
  if (normalizedName === normalizedKeyword) return 0;
  if (normalizedName.startsWith(normalizedKeyword)) return 1;
  if (normalizedName.includes(normalizedKeyword)) return 2;
  return 3;
};

export const searchStations = async ({
  keyword,
  lat,
  lng,
  limit = 8
}: StationSearchInput): Promise<StationCandidate[]> => {
  const textQuery = keyword.trim();
  if (textQuery.length < 1) {
    return [];
  }
  if (!isConfigured()) {
    return searchDemoStations(textQuery, limit);
  }

  try {
    const seen = new Set<string>();
    const candidates: StationCandidate[] = [];
    const query = /駅|station/i.test(textQuery) ? textQuery : `${textQuery} 駅`;
    const maxResultCount = Math.max(1, Math.min(20, limit));
    const locationBias =
      lat != null && lng != null
        ? {
            circle: {
              center: {
                latitude: lat,
                longitude: lng
              },
              radius: 50_000
            }
          }
        : undefined;

    const appendPlaces = (places: GooglePlace[] = []) => {
      for (const place of places) {
        const candidate = toStationCandidate(place);
        if (!candidate) continue;

        const key = `${candidate.id}:${normalizePlaceName(candidate.name)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push(candidate);
      }
    };

    const searchText = async (includedType?: string) => {
      const response = await fetch(textSearchUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": env.GOOGLE_MAPS_SERVER_API_KEY!,
          "X-Goog-FieldMask": stationFieldMask
        },
        body: JSON.stringify({
          includedType,
          languageCode: "ja",
          locationBias,
          maxResultCount,
          regionCode: "JP",
          strictTypeFiltering: Boolean(includedType),
          textQuery: query
        }),
        signal: AbortSignal.timeout(2500)
      });

      if (!response.ok) {
        warnPlaces(`Station Text Search failed with ${response.status}`);
        return;
      }

      const payload = (await response.json()) as GoogleNearbyResponse;
      appendPlaces(payload.places);
    };

    await searchText();

    if (candidates.length === 0) {
      for (const includedType of stationTypes) {
        await searchText(includedType);
        if (candidates.length >= maxResultCount) {
          break;
        }
      }
    }

    const results = candidates
      .sort((a, b) => scoreStationCandidate(a, textQuery) - scoreStationCandidate(b, textQuery))
      .slice(0, maxResultCount);
    return results.length > 0 ? results : searchDemoStations(textQuery, maxResultCount);
  } catch (error) {
    warnPlaces("Station Text Search request failed", error);
    return searchDemoStations(textQuery, limit);
  }
};
