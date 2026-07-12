import { Router } from "express";
import { blockUser, createReport, unblockUser } from "../controllers/safetyController.js";
import { requireAuth } from "../middlewares/auth.js";
import { validateBody, validateParams } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { blockedUserIdParamSchema } from "../validations/common.js";
import { blockCreateSchema, reportCreateSchema } from "../validations/safetyValidation.js";
import { blockInDemo } from "../middlewares/demoPolicy.js";

export const reportRouter = Router();
export const blockRouter = Router();

reportRouter.post("/", requireAuth, blockInDemo, validateBody(reportCreateSchema), asyncHandler(createReport));

blockRouter.post("/", requireAuth, blockInDemo, validateBody(blockCreateSchema), asyncHandler(blockUser));
blockRouter.delete(
  "/:blockedUserId",
  requireAuth,
  blockInDemo,
  validateParams(blockedUserIdParamSchema),
  asyncHandler(unblockUser)
);
