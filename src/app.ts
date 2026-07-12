import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { openApiSpec } from "./config/openapi.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFoundHandler } from "./middlewares/notFound.js";
import { apiRouter } from "./routes/index.js";
import { sendSuccess } from "./utils/apiResponse.js";
import { demoMutationLimiter } from "./middlewares/rateLimits.js";
import { prisma } from "./utils/prisma.js";
import { DEMO_USER_ID } from "./config/demo.js";

export const app = express();

if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        "img-src": ["'self'", "data:", "blob:", "https:", "http:"],
        "media-src": ["'self'", "data:", "blob:", "https:", "http:"]
      }
    }
  })
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.CORS_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true
  })
);
app.use(express.json({ limit: "256kb" }));

if (env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.get("/health", (_req, res) => sendSuccess(res, { status: "ok" }));
app.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const demoUser = env.DEMO_MODE ? await prisma.user.findUnique({ where: { id: DEMO_USER_ID }, select: { id: true } }) : true;
    if (!demoUser) {
      return res.status(503).json({ success: false, error: { code: "DEMO_NOT_READY", message: "Demo fixtures are missing" } });
    }
    return sendSuccess(res, { status: "ready", demoUser: Boolean(demoUser) });
  } catch {
    return res.status(503).json({ success: false, error: { code: "NOT_READY", message: "Database is unavailable" } });
  }
});
app.get("/openapi.json", (_req, res) => res.json(openApiSpec));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.use("/api", demoMutationLimiter, apiRouter);

if (env.NODE_ENV === "production") {
  const frontendDist = path.resolve(process.cwd(), "frontend", "dist");
  const frontendIndex = path.join(frontendDist, "index.html");
  if (fs.existsSync(frontendIndex)) {
    app.use(express.static(frontendDist));
    app.get("*", (_req, res) => res.sendFile(frontendIndex));
  }
}

app.use(notFoundHandler);
app.use(errorHandler);
