import { Router } from "express";
import { deleteSavedSpot, listSavedSpots, saveSpot } from "../controllers/savedSpotController.js";
import { requireAuth } from "../middlewares/auth.js";
import { validateBody, validateParams } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { savedSpotCreateSchema } from "../validations/feedbackValidation.js";
import { spotIdParamSchema } from "../validations/common.js";

export const savedSpotRouter = Router();

savedSpotRouter.use(requireAuth);
savedSpotRouter.get("/", asyncHandler(listSavedSpots));
savedSpotRouter.post("/", validateBody(savedSpotCreateSchema), asyncHandler(saveSpot));
savedSpotRouter.delete("/:spotId", validateParams(spotIdParamSchema), asyncHandler(deleteSavedSpot));
