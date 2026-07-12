import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { sendError } from "../utils/apiResponse.js";

const handler = (_req: unknown, res: Parameters<typeof sendError>[0]) =>
  sendError(res, 429, "RATE_LIMITED", "操作が集中しています。しばらくしてから再試行してください");

export const demoLoginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => !env.DEMO_MODE,
  handler
});

export const demoMutationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) => !env.DEMO_MODE || ["GET", "HEAD", "OPTIONS"].includes(req.method),
  handler
});
