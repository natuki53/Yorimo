import dotenv from "dotenv";

dotenv.config();

const parseCorsOrigins = (value?: string): string[] => {
  if (!value) {
    return [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5173"
    ];
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const nodeEnv = process.env.NODE_ENV ?? "development";
const parseBoolean = (value: string | undefined, fallback = false) => {
  if (value == null) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
};
const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};
const jwtSecret = process.env.JWT_SECRET ?? (nodeEnv === "production" ? undefined : "dev-only-change-me");

if (!jwtSecret) {
  throw new Error("JWT_SECRET is required in production");
}

export const env = {
  NODE_ENV: nodeEnv,
  PORT: Number(process.env.PORT ?? 4000),
  DATABASE_URL: process.env.DATABASE_URL,
  GOOGLE_MAPS_SERVER_API_KEY:
    process.env.GOOGLE_MAPS_SERVER_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY,
  DEMO_MODE: parseBoolean(process.env.DEMO_MODE, nodeEnv !== "production"),
  ALLOW_DEMO_RESET: parseBoolean(process.env.ALLOW_DEMO_RESET),
  EXPOSE_API_DOCS: parseBoolean(process.env.EXPOSE_API_DOCS, nodeEnv !== "production"),
  DEMO_LOGIN_RATE_LIMIT: parsePositiveInt(process.env.DEMO_LOGIN_RATE_LIMIT, 90),
  DEMO_MUTATION_RATE_LIMIT: parsePositiveInt(process.env.DEMO_MUTATION_RATE_LIMIT, 600),
  RECOMMENDATION_RATE_LIMIT: parsePositiveInt(process.env.RECOMMENDATION_RATE_LIMIT, 180),
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES_IN:
    process.env.JWT_EXPIRES_IN ?? (parseBoolean(process.env.DEMO_MODE, nodeEnv !== "production") ? "8h" : "7d"),
  CORS_ORIGINS: parseCorsOrigins(process.env.CORS_ORIGINS ?? process.env.CORS_ORIGIN)
};
