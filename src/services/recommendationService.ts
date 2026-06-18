import type { Feedback, Route, Spot, User } from "@prisma/client";
import { prisma } from "../utils/prisma.js";
import { forbidden, notFound } from "../utils/errors.js";
import { distanceKm, distancePointToSegmentKm } from "../utils/geo.js";

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

const scoreRouteFit = (
  spot: Spot,
  current: { lat: number; lng: number },
  route: Route | null
) => {
  const currentDistance = distanceKm(current, { lat: spot.lat, lng: spot.lng });
  const currentScore =
    currentDistance <= 0.5 ? 100 : currentDistance <= 1.5 ? 85 : currentDistance <= 3 ? 65 : currentDistance <= 5 ? 45 : 20;

  if (!route) {
    return currentScore;
  }

  const routeDistance = distancePointToSegmentKm(
    { lat: spot.lat, lng: spot.lng },
    { lat: route.startLat, lng: route.startLng },
    { lat: route.endLat, lng: route.endLng }
  );
  const routeScore =
    routeDistance <= 0.5 ? 100 : routeDistance <= 1.5 ? 85 : routeDistance <= 3 ? 65 : routeDistance <= 5 ? 45 : 20;

  return clampScore(currentScore * 0.45 + routeScore * 0.55);
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

  const spots = await prisma.spot.findMany({
    orderBy: { createdAt: "desc" },
    take: 200
  });

  const effectiveBudgetMin = input.budgetMin ?? user.defaultBudgetMin;
  const effectiveBudgetMax = input.budgetMax ?? user.defaultBudgetMax;
  const interestTags = uniq([...user.interests, ...input.interestTags]);
  const behaviorProfile = buildBehaviorProfile(user.feedbacks, user.savedSpots);
  const current = { lat: input.currentLat, lng: input.currentLng };

  const items = spots
    .map((spot) => {
      const breakdown: ScoreBreakdown = {
        behavior: scoreBehavior(spot, behaviorProfile),
        route: scoreRouteFit(spot, current, route),
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
    .sort((a, b) => b.yorimichiScore - a.yorimichiScore)
    .slice(0, 20);

  return { items };
};
