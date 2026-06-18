import dotenv from "dotenv";

dotenv.config();

const parseCorsOrigins = (value?: string): string[] => {
  if (!value) {
    return ["http://localhost:3000", "http://localhost:5173"];
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const nodeEnv = process.env.NODE_ENV ?? "development";
const jwtSecret = process.env.JWT_SECRET ?? (nodeEnv === "production" ? undefined : "dev-only-change-me");

if (!jwtSecret) {
  throw new Error("JWT_SECRET is required in production");
}

export const env = {
  NODE_ENV: nodeEnv,
  PORT: Number(process.env.PORT ?? 4000),
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "7d",
  CORS_ORIGINS: parseCorsOrigins(process.env.CORS_ORIGIN)
};
