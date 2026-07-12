import type { Feedback, Route, Spot, User } from "@prisma/client";
import { prisma } from "../utils/prisma.js";
import { forbidden, notFound } from "../utils/errors.js";
import { distanceKm, distancePointToSegmentKm } from "../utils/geo.js";
import { searchStations, syncNearbyPlaces } from "./googlePlacesService.js";
import { getRailRoutePath } from "./railRouteService.js";
import { isRecommendableSpot } from "./spotEligibilityService.js";

type RecommendationInput = {
  userId: string;
  currentLat: number;
  currentLng: number;
  routeId?: string | null;
  availableMinutes: number;
  budgetMin?: number | null;
  budgetMax?: number | null;
  mood?: string | null;
  interestTags: string[];
};

type FeedbackWithSpot = Feedback & {
  spot: Pick<Spot, "category" | "tags">;
};

type RouteLocation = Pick<
  Route,
  | "startType"
  | "startName"
  | "startLat"
  | "startLng"
  | "endType"
  | "endName"
  | "endLat"
  | "endLng"
  | "travelMode"
  | "viaStationNames"
>;

type SpotRouteLocation = Pick<Spot, "lat" | "lng" | "stationName">;

type GeoPoint = { lat: number; lng: number };

type BehaviorProfile = {
  categoryScores: Map<string, number>;
  tagScores: Map<string, number>;
  hasHistory: boolean;
};

type ScoreBreakdown = {
  behavior: number;
  route: number;
  interest: number;
  time: number;
  budget: number;
  mood: number;
  freshness: number;
};

const POSITIVE_ACTION_WEIGHTS: Record<string, number> = {
  view: 1,
  save: 4,
  visited: 5,
  like: 4
};

const NEGATIVE_ACTION_WEIGHTS: Record<string, number> = {
  skip: -2,
  dislike: -4,
  report: -5
};

const clampScore = (score: number) => Math.max(0, Math.min(100, Math.round(score)));

const uniq = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const normalizeStationName = (stationName?: string | null) => {
  if (!stationName) {
    return null;
  }

  const normalized = stationName.trim().replace(/\s+/g, "").replace(/駅$/, "").toLocaleLowerCase("ja-JP");
  return normalized || null;
};

const getRouteStationNames = (route: RouteLocation) =>
  new Set(
    [route.startName, route.endName, ...route.viaStationNames]
      .map((stationName) => normalizeStationName(stationName))
      .filter((stationName): stationName is string => Boolean(stationName))
  );

const routeEndpointPoints = (route: RouteLocation) => [
  { lat: route.startLat, lng: route.startLng },
  { lat: route.endLat, lng: route.endLng }
];

const dedupePoints = (points: GeoPoint[], minDistanceKm = 0.25) =>
  points.reduce<GeoPoint[]>((deduped, point) => {
    if (!deduped.some((existing) => distanceKm(existing, point) < minDistanceKm)) {
      deduped.push(point);
    }
    return deduped;
  }, []);

const sampleSegmentPoints = (start: GeoPoint, end: GeoPoint, maxSegments = 4) => {
  const distance = distanceKm(start, end);
  const segmentCount = Math.max(1, Math.min(maxSegments, Math.ceil(distance / 2.5)));

  return Array.from({ length: segmentCount + 1 }, (_item, index) => {
    const ratio = index / segmentCount;
    return {
      lat: start.lat + (end.lat - start.lat) * ratio,
      lng: start.lng + (end.lng - start.lng) * ratio
    };
  });
};

const polylineDistanceKm = (points: GeoPoint[]) =>
  points.slice(0, -1).reduce((total, point, index) => total + distanceKm(point, points[index + 1]), 0);

const samplePolylinePoints = (points: GeoPoint[], maxPoints = 8) => {
  if (points.length <= maxPoints) {
    return dedupePoints(points);
  }

  const totalDistance = polylineDistanceKm(points);
  if (totalDistance === 0) {
    return dedupePoints([points[0]]);
  }

  const targets = Array.from({ length: maxPoints }, (_item, index) => (totalDistance * index) / (maxPoints - 1));
  const sampled: GeoPoint[] = [points[0]];
  let segmentStartDistance = 0;
  let targetIndex = 1;

  for (let index = 0; index < points.length - 1 && targetIndex < targets.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const segmentDistance = distanceKm(start, end);
    const segmentEndDistance = segmentStartDistance + segmentDistance;

    while (targetIndex < targets.length - 1 && targets[targetIndex] <= segmentEndDistance) {
      const ratio = segmentDistance === 0 ? 0 : (targets[targetIndex] - segmentStartDistance) / segmentDistance;
      sampled.push({
        lat: start.lat + (end.lat - start.lat) * ratio,
        lng: start.lng + (end.lng - start.lng) * ratio
      });
      targetIndex += 1;
    }

    segmentStartDistance = segmentEndDistance;
  }

  sampled.push(points[points.length - 1]);
  return dedupePoints(sampled);
};

const distancePointToPolylineKm = (point: GeoPoint, routePoints: GeoPoint[]) => {
  if (routePoints.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  if (routePoints.length === 1) {
    return distanceKm(point, routePoints[0]);
  }

  return routePoints.slice(0, -1).reduce((minDistance, start, index) => {
    const end = routePoints[index + 1];
    return Math.min(minDistance, distancePointToSegmentKm(point, start, end));
  }, Number.POSITIVE_INFINITY);
};

const buildBehaviorProfile = (
  feedbacks: FeedbackWithSpot[],
  savedSpots: Array<{ spot: Pick<Spot, "category" | "tags"> }>
): BehaviorProfile => {
  const categoryScores = new Map<string, number>();
  const tagScores = new Map<string, number>();

  const add = (map: Map<string, number>, key: string, amount: number) => {
    map.set(key, (map.get(key) ?? 0) + amount);
  };

  for (const feedback of feedbacks) {
    const weight = POSITIVE_ACTION_WEIGHTS[feedback.action] ?? NEGATIVE_ACTION_WEIGHTS[feedback.action] ?? 0;
    add(categoryScores, feedback.spot.category, weight);
    for (const tag of feedback.spot.tags) {
      add(tagScores, tag, weight);
    }
  }

  for (const saved of savedSpots) {
    add(categoryScores, saved.spot.category, 5);
    for (const tag of saved.spot.tags) {
      add(tagScores, tag, 5);
    }
  }

  return {
    categoryScores,
    tagScores,
    hasHistory: feedbacks.length > 0 || savedSpots.length > 0
  };
};

const scoreBehavior = (spot: Spot, profile: BehaviorProfile) => {
  if (!profile.hasHistory) {
    return 50;
  }

  const categoryScore = profile.categoryScores.get(spot.category) ?? 0;
  const tagScore = spot.tags.reduce((sum, tag) => sum + (profile.tagScores.get(tag) ?? 0), 0);
  const rawScore = 45 + categoryScore * 8 + tagScore * 4;

  return clampScore(rawScore);
};

const scoreLinearRouteFit = (spot: SpotRouteLocation, route: RouteLocation) => {
  const routeDistance = distancePointToSegmentKm(
    { lat: spot.lat, lng: spot.lng },
    { lat: route.startLat, lng: route.startLng },
    { lat: route.endLat, lng: route.endLng }
  );

  return routeDistance <= 0.5 ? 100 : routeDistance <= 1.5 ? 85 : routeDistance <= 3 ? 65 : routeDistance <= 5 ? 45 : 20;
};

const scoreStationRouteFit = (spot: SpotRouteLocation, route: RouteLocation) => {
  if (
    route.travelMode !== "transit" ||
    (route.startType !== "station" && route.endType !== "station" && route.viaStationNames.length === 0)
  ) {
    return null;
  }

  const spotStationName = normalizeStationName(spot.stationName);
  if (!spotStationName) {
    return null;
  }

  const routeStationNames = getRouteStationNames(route);
  if (routeStationNames.has(spotStationName)) {
    return 100;
  }

  return route.viaStationNames.length > 0 ? 20 : null;
};

const resolveTransitRoutePoints = async (route: RouteLocation): Promise<GeoPoint[]> => {
  const points: GeoPoint[] = [{ lat: route.startLat, lng: route.startLng }];
  const bias = { lat: route.startLat, lng: route.startLng };

  for (const stationName of route.viaStationNames) {
    const [candidate] = await searchStations({
      keyword: stationName,
      lat: bias.lat,
      lng: bias.lng,
      limit: 1
    });
    if (candidate) {
      points.push({ lat: candidate.lat, lng: candidate.lng });
      bias.lat = candidate.lat;
      bias.lng = candidate.lng;
    }
  }

  points.push({ lat: route.endLat, lng: route.endLng });
  return dedupePoints(points);
};

const buildRouteSearchPoints = async (route: RouteLocation | null, current: GeoPoint) => {
  if (!route) {
    return {
      filterPoints: [current],
      syncPoints: [current],
      radiusKm: 1.5
    };
  }

  if (route.travelMode === "transit") {
    const railRoutePoints = await getRailRoutePath({
      startLat: route.startLat,
      startLng: route.startLng,
      endLat: route.endLat,
      endLng: route.endLng
    });
    const routePoints = railRoutePoints.length >= 2 ? railRoutePoints : await resolveTransitRoutePoints(route);

    return {
      filterPoints: routePoints,
      syncPoints: samplePolylinePoints(routePoints, 8),
      radiusKm: railRoutePoints.length >= 2 ? 0.9 : 1.2
    };
  }

  const [start, end] = routeEndpointPoints(route);
  const sampledPoints = dedupePoints(sampleSegmentPoints(start, end));
  return {
    filterPoints: sampledPoints,
    syncPoints: sampledPoints,
    radiusKm: route.travelMode === "walking" || route.travelMode === "bicycling" ? 1 : 1.5
  };
};

export const scoreRouteFit = (
  spot: SpotRouteLocation,
  current: { lat: number; lng: number },
  route: RouteLocation | null,
  routePoints: GeoPoint[] = []
) => {
  const currentDistance = distanceKm(current, { lat: spot.lat, lng: spot.lng });
  const currentScore =
    currentDistance <= 0.5 ? 100 : currentDistance <= 1.5 ? 85 : currentDistance <= 3 ? 65 : currentDistance <= 5 ? 45 : 20;

  if (!route) {
    return currentScore;
  }

  const routeDistance = distancePointToPolylineKm({ lat: spot.lat, lng: spot.lng }, routePoints);
  const polylineRouteScore = Number.isFinite(routeDistance)
    ? routeDistance <= 0.3
      ? 100
      : routeDistance <= 0.9
        ? 88
        : routeDistance <= 1.5
          ? 72
          : routeDistance <= 3
            ? 50
            : 20
    : null;
  const routeScore = scoreStationRouteFit(spot, route) ?? polylineRouteScore ?? scoreLinearRouteFit(spot, route);

  return clampScore(currentScore * 0.2 + routeScore * 0.8);
};

const scoreInterest = (spot: Spot, interestTags: string[]) => {
  const interests = uniq(interestTags);

  if (interests.length === 0) {
    return 50;
  }

  const spotTerms = new Set([spot.category, ...spot.tags]);
  const matched = interests.filter((interest) => spotTerms.has(interest)).length;

  return clampScore((matched / interests.length) * 100);
};

const scoreTime = (spot: Spot, availableMinutes: number) => {
  if (!spot.averageStayMinutes) {
    return 60;
  }

  if (spot.averageStayMinutes <= availableMinutes) {
    return 100;
  }

  if (spot.averageStayMinutes <= availableMinutes + 15) {
    return 70;
  }

  if (spot.averageStayMinutes <= availableMinutes + 30) {
    return 40;
  }

  return 10;
};

const scoreBudget = (spot: Spot, budgetMin?: number | null, budgetMax?: number | null) => {
  if (budgetMin == null && budgetMax == null) {
    return 60;
  }

  if (spot.priceMin == null && spot.priceMax == null) {
    return 60;
  }

  const min = budgetMin ?? 0;
  const max = budgetMax ?? Number.MAX_SAFE_INTEGER;
  const spotMin = spot.priceMin ?? 0;
  const spotMax = spot.priceMax ?? spotMin;

  if (spotMax <= max && spotMin >= min) {
    return 100;
  }

  if (spotMin <= max && spotMax >= min) {
    return 70;
  }

  return 15;
};

const moodKeywords = (mood?: string | null) => {
  if (!mood) {
    return [];
  }

  const directTerms = mood
    .split(/[\s,、。.!?！？]+/)
    .map((term) => term.trim())
    .filter(Boolean);

  const inferredTerms: string[] = [];
  if (mood.includes("甘") || mood.includes("スイーツ") || mood.includes("デザート")) {
    inferredTerms.push("スイーツ", "カフェ");
  }
  if (mood.includes("静") || mood.includes("勉強") || mood.includes("作業")) {
    inferredTerms.push("静かな場所", "勉強場所", "カフェ");
  }
  if (mood.includes("運動") || mood.includes("汗") || mood.includes("整")) {
    inferredTerms.push("ジム", "サウナ");
  }
  if (mood.includes("買") || mood.includes("服")) {
    inferredTerms.push("買い物", "古着");
  }
  if (mood.includes("映画")) {
    inferredTerms.push("映画");
  }

  return uniq([...directTerms, ...inferredTerms]);
};

const scoreMood = (spot: Spot, mood?: string | null) => {
  const keywords = moodKeywords(mood);

  if (keywords.length === 0) {
    return 50;
  }

  const searchable = [spot.name, spot.description ?? "", spot.category, ...spot.tags].join(" ");
  const matched = keywords.filter((keyword) => searchable.includes(keyword)).length;

  return clampScore((matched / keywords.length) * 100);
};

const scoreFreshness = (spot: Spot) => {
  const ageDays = (Date.now() - spot.createdAt.getTime()) / (1000 * 60 * 60 * 24);

  if (ageDays <= 7) {
    return 100;
  }

  if (ageDays <= 30) {
    return 80;
  }

  if (ageDays <= 90) {
    return 60;
  }

  return 40;
};

const totalScore = (breakdown: ScoreBreakdown) => {
  return clampScore(
    (breakdown.behavior * 25 +
      breakdown.route * 20 +
      breakdown.interest * 15 +
      breakdown.time * 15 +
      breakdown.budget * 10 +
      breakdown.mood * 10 +
      breakdown.freshness * 5) /
      100
  );
};

const buildReasons = (
  spot: Spot,
  score: ScoreBreakdown,
  input: RecommendationInput,
  effectiveBudgetMax?: number | null
) => {
  const reasons: string[] = [];

  if (score.route >= 70) {
    reasons.push("現在地または登録ルートから近い");
  }
  if (score.budget >= 70 && effectiveBudgetMax != null) {
    reasons.push(`予算${effectiveBudgetMax}円以内に収まりやすい`);
  }
  if (score.interest >= 70) {
    reasons.push("興味タグと相性がよい");
  }
  if (score.behavior >= 70) {
    reasons.push(`${spot.category}系スポットへの過去の反応が良い`);
  }
  if (score.time >= 70) {
    reasons.push(`${input.availableMinutes}分以内の寄り道にちょうどいい`);
  }
  if (score.mood >= 70 && input.mood) {
    reasons.push("今の気分に合うキーワードが含まれている");
  }
  if (reasons.length === 0) {
    reasons.push("条件に対してバランスよく一致している");
  }

  return reasons;
};

export const getRecommendations = async (input: RecommendationInput) => {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    include: {
      feedbacks: {
        include: {
          spot: {
            select: { category: true, tags: true }
          }
        },
        take: 100,
        orderBy: { createdAt: "desc" }
      },
      savedSpots: {
        include: {
          spot: {
            select: { category: true, tags: true }
          }
        }
      }
    }
  });

  if (!user) {
    throw notFound("ユーザーが見つかりません");
  }

  let route: Route | null = null;
  if (input.routeId) {
    route = await prisma.route.findUnique({ where: { id: input.routeId } });
    if (!route) {
      throw notFound("ルートが見つかりません");
    }
    if (route.userId !== input.userId) {
      throw forbidden("自分のルートのみ推薦条件に使えます");
    }
  }

  const effectiveBudgetMin = input.budgetMin ?? user.defaultBudgetMin;
  const effectiveBudgetMax = input.budgetMax ?? user.defaultBudgetMax;
  const interestTags = uniq([...user.interests, ...input.interestTags]);
  const behaviorProfile = buildBehaviorProfile(user.feedbacks, user.savedSpots);
  const current = { lat: input.currentLat, lng: input.currentLng };
  const searchRadiusKm = Math.max(1.5, Math.min(8, input.availableMinutes / 10));
  const routeSearch = await buildRouteSearchPoints(route, current);
  const nearbySearchPoints = route ? routeSearch.syncPoints : [current];

  const syncedBatches = await Promise.all(
    nearbySearchPoints.slice(0, route ? 8 : 1).map((point) =>
      syncNearbyPlaces({
        lat: point.lat,
        lng: point.lng,
        limit: route ? 10 : 20,
        radiusKm: route ? routeSearch.radiusKm : searchRadiusKm
      })
    )
  );
  const googleSpotIds = new Set(syncedBatches.flat().map((spot) => spot.id));

  const spots = (await prisma.spot.findMany({
    orderBy: { createdAt: "desc" },
    take: 500
  })).filter(isRecommendableSpot).filter((spot) => {
    const point = { lat: spot.lat, lng: spot.lng };
    const currentDistance = distanceKm(current, { lat: spot.lat, lng: spot.lng });
    if (!route) {
      return currentDistance <= searchRadiusKm;
    }

    if (route.travelMode === "transit" && scoreStationRouteFit(spot, route) != null) {
      return true;
    }

    return distancePointToPolylineKm(point, routeSearch.filterPoints) <= routeSearch.radiusKm;
  });

  const items = spots
    .map((spot) => {
      const breakdown: ScoreBreakdown = {
        behavior: scoreBehavior(spot, behaviorProfile),
        route: scoreRouteFit(spot, current, route, routeSearch.filterPoints),
        interest: scoreInterest(spot, interestTags),
        time: scoreTime(spot, input.availableMinutes),
        budget: scoreBudget(spot, effectiveBudgetMin, effectiveBudgetMax),
        mood: scoreMood(spot, input.mood),
        freshness: scoreFreshness(spot)
      };
      const yorimichiScore = totalScore(breakdown);

      return {
        spot,
        yorimichiScore,
        scoreBreakdown: breakdown,
        reasons: buildReasons(spot, breakdown, input, effectiveBudgetMax)
      };
    })
    .sort((a, b) => {
      const sourcePriority = Number(googleSpotIds.has(b.spot.id)) - Number(googleSpotIds.has(a.spot.id));
      return sourcePriority || b.yorimichiScore - a.yorimichiScore;
    })
    .slice(0, 20);

  return {
    items,
    source: googleSpotIds.size > 0 ? "google_places" as const : "demo_fallback" as const
  };
};
