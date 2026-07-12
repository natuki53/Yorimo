import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { createAccessToken } from "../src/services/authService.js";
import { env } from "../src/config/env.js";

describe("demo access tokens", () => {
  it("issues independent tokens for the same shared user", () => {
    const user = { id: "demo-user", email: "demo@yorimo.local" };
    const tokens = Array.from({ length: 10 }, () => createAccessToken(user));
    const payloads = tokens.map((token) => jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload);

    expect(new Set(tokens)).toHaveLength(10);
    expect(new Set(payloads.map((payload) => payload.sub))).toEqual(new Set([user.id]));
    expect(new Set(payloads.map((payload) => payload.jti))).toHaveLength(10);
  });
});
