import { Router } from "express";
import { getPlacePhoto } from "../controllers/placePhotoController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const placePhotoRouter = Router();

placePhotoRouter.get("/:photoName", asyncHandler(getPlacePhoto));
