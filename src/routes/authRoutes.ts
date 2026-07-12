import { Router } from "express";
import { demoLogin, getMe, login, register, updateProfile } from "../controllers/authController.js";
import { env } from "../config/env.js";
import { requireAuth } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateBody } from "../middlewares/validate.js";
import { loginSchema, registerSchema, updateProfileSchema } from "../validations/authValidation.js";
import { demoLoginLimiter } from "../middlewares/rateLimits.js";

export const authRouter = Router();

if (env.DEMO_MODE) {
  authRouter.post("/demo", demoLoginLimiter, asyncHandler(demoLogin));
}
authRouter.post("/register", validateBody(registerSchema), asyncHandler(register));
authRouter.post("/login", validateBody(loginSchema), asyncHandler(login));
authRouter.get("/me", requireAuth, asyncHandler(getMe));
authRouter.patch("/me", requireAuth, validateBody(updateProfileSchema), asyncHandler(updateProfile));
