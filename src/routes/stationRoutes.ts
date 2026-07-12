import { Router } from "express";
import { listStations } from "../controllers/stationController.js";
import { validateQuery } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { stationQuerySchema } from "../validations/stationValidation.js";

export const stationRouter = Router();

stationRouter.get("/", validateQuery(stationQuerySchema), asyncHandler(listStations));
