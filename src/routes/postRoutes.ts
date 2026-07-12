import { Router } from "express";
import {
  createPost,
  deletePost,
  getPost,
  listPosts,
  updatePost
} from "../controllers/postController.js";
import { requireAuth } from "../middlewares/auth.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { idParamSchema } from "../validations/common.js";
import { postCreateSchema, postQuerySchema, postUpdateSchema } from "../validations/postValidation.js";
import { blockInDemo } from "../middlewares/demoPolicy.js";

export const postRouter = Router();

postRouter.use(requireAuth);
postRouter.get("/", validateQuery(postQuerySchema), asyncHandler(listPosts));
postRouter.post("/", validateBody(postCreateSchema), asyncHandler(createPost));
postRouter.get("/:id", validateParams(idParamSchema), asyncHandler(getPost));
postRouter.patch("/:id", blockInDemo, validateParams(idParamSchema), validateBody(postUpdateSchema), asyncHandler(updatePost));
postRouter.delete("/:id", blockInDemo, validateParams(idParamSchema), asyncHandler(deletePost));
