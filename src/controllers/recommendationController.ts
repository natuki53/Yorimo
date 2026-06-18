import type { Request, Response } from "express";
import { sendSuccess } from "../utils/apiResponse.js";
import { getRecommendations } from "../services/recommendationService.js";

export const createRecommendations = async (req: Request, res: Response) => {
  const result = await getRecommendations({
    userId: req.user!.id,
    currentLat: req.body.currentLat,
    currentLng: req.body.currentLng,
    routeId: req.body.routeId,
    availableMinutes: req.body.availableMinutes,
    budgetMin: req.body.budgetMin,
    budgetMax: req.body.budgetMax,
    mood: req.body.mood,
    interestTags: req.body.interestTags ?? []
  });

  return sendSuccess(res, result);
};
