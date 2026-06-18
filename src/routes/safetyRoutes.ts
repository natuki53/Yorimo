import { Router } from "express";
import { blockUser, createReport, unblockUser } from "../controllers/safetyController.js";
import { requireAuth } from "../middlewares/auth.js";
import { validateBody, validateParams } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { blockedUserIdParamSchema } from "../validations/common.js";
import { blockCreateSchema, reportCreateSchema } from "../validations/safetyValidation.js";

export const reportRouter = Router();
export const blockRouter = Router();

reportRouter.post("/", requireAuth, validateBody(reportCreateSchema), asyncHandler(createReport));

blockRouter.post("/", requireAuth, validateBody(blockCreateSchema), asyncHandler(blockUser));
blockRouter.delete(
  "/:blockedUserId",
  requireAuth,
  validateParams(blockedUserIdParamSchema),
  asyncHandler(unblockUser)
);
