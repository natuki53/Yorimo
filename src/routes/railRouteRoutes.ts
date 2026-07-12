import { Router } from "express";
import { getRailRoute } from "../controllers/railRouteController.js";
import { validateQuery } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { railRouteQuerySchema } from "../validations/railRouteValidation.js";

export const railRouteRouter = Router();

railRouteRouter.get("/", validateQuery(railRouteQuerySchema), asyncHandler(getRailRoute));
