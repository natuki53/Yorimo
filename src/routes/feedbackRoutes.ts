import { Router } from "express";
import { createFeedback } from "../controllers/feedbackController.js";
import { requireAuth } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { feedbackCreateSchema } from "../validations/feedbackValidation.js";

export const feedbackRouter = Router();

feedbackRouter.post("/", requireAuth, validateBody(feedbackCreateSchema), asyncHandler(createFeedback));
