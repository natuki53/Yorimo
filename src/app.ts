import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { openApiSpec } from "./config/openapi.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFoundHandler } from "./middlewares/notFound.js";
import { apiRouter } from "./routes/index.js";
import { sendSuccess } from "./utils/apiResponse.js";

export const app = express();

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
app.use(express.json({ limit: "10mb" }));

if (env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.get("/health", (_req, res) => sendSuccess(res, { status: "ok" }));
app.get("/openapi.json", (_req, res) => res.json(openApiSpec));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.use("/api", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
