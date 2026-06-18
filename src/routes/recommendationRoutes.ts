import { Router } from "express";
import { createRecommendations } from "../controllers/recommendationController.js";
import { requireAuth } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recommendationRequestSchema } from "../validations/recommendationValidation.js";

export const recommendationRouter = Router();

recommendationRouter.post("/", requireAuth, validateBody(recommendationRequestSchema), asyncHandler(createRecommendations));
