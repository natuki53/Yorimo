import { Router } from "express";
import { createRecommendations } from "../controllers/recommendationController.js";
import { requireAuth } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recommendationRequestSchema } from "../validations/recommendationValidation.js";
import { recommendationLimiter } from "../middlewares/rateLimits.js";

export const recommendationRouter = Router();

recommendationRouter.post(
  "/",
  requireAuth,
  recommendationLimiter,
  validateBody(recommendationRequestSchema),
  asyncHandler(createRecommendations)
);
