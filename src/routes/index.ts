import { Router } from "express";
import { getFeed } from "../controllers/postController.js";
import { requireAuth } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authRouter } from "./authRoutes.js";
import { blockRouter, reportRouter } from "./safetyRoutes.js";
import { feedbackRouter } from "./feedbackRoutes.js";
import { postRouter } from "./postRoutes.js";
import { recommendationRouter } from "./recommendationRoutes.js";
import { routeRouter } from "./routeRoutes.js";
import { savedSpotRouter } from "./savedSpotRoutes.js";
import { spotRouter } from "./spotRoutes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/routes", routeRouter);
apiRouter.use("/spots", spotRouter);
apiRouter.use("/recommendations", recommendationRouter);
apiRouter.use("/posts", postRouter);
apiRouter.use("/feedback", feedbackRouter);
apiRouter.use("/saved-spots", savedSpotRouter);
apiRouter.use("/reports", reportRouter);
apiRouter.use("/blocks", blockRouter);
apiRouter.get("/feed", requireAuth, asyncHandler(getFeed));
