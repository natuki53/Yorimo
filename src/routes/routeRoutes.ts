import { Router } from "express";
import {
  createRoute,
  deleteRoute,
  getRoute,
  listRoutes,
  updateRoute
} from "../controllers/routeController.js";
import { requireAuth } from "../middlewares/auth.js";
import { validateBody, validateParams } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { idParamSchema } from "../validations/common.js";
import { routeCreateSchema, routeUpdateSchema } from "../validations/routeValidation.js";

export const routeRouter = Router();

routeRouter.use(requireAuth);
routeRouter.get("/", asyncHandler(listRoutes));
routeRouter.post("/", validateBody(routeCreateSchema), asyncHandler(createRoute));
routeRouter.get("/:id", validateParams(idParamSchema), asyncHandler(getRoute));
routeRouter.patch("/:id", validateParams(idParamSchema), validateBody(routeUpdateSchema), asyncHandler(updateRoute));
routeRouter.delete("/:id", validateParams(idParamSchema), asyncHandler(deleteRoute));
