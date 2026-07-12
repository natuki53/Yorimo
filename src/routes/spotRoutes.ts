import { Router } from "express";
import {
  createSpot,
  deleteSpot,
  getSpot,
  listSpots,
  updateSpot
} from "../controllers/spotController.js";
import { listSpotPosts } from "../controllers/postController.js";
import { requireAuth } from "../middlewares/auth.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { idParamSchema } from "../validations/common.js";
import { spotCreateSchema, spotQuerySchema, spotUpdateSchema } from "../validations/spotValidation.js";
import { blockInDemo } from "../middlewares/demoPolicy.js";

export const spotRouter = Router();

spotRouter.get("/", validateQuery(spotQuerySchema), asyncHandler(listSpots));
spotRouter.post("/", requireAuth, blockInDemo, validateBody(spotCreateSchema), asyncHandler(createSpot));
spotRouter.get("/:id/posts", validateParams(idParamSchema), asyncHandler(listSpotPosts));
spotRouter.get("/:id", validateParams(idParamSchema), asyncHandler(getSpot));
spotRouter.patch("/:id", requireAuth, blockInDemo, validateParams(idParamSchema), validateBody(spotUpdateSchema), asyncHandler(updateSpot));
spotRouter.delete("/:id", requireAuth, blockInDemo, validateParams(idParamSchema), asyncHandler(deleteSpot));
