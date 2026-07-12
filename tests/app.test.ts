import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("Yorimo API", () => {
  it("returns health check with unified success response", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { status: "ok" }
    });
  });

  it("marks API responses as non-cacheable", async () => {
    const response = await request(app).get("/api/routes");

    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("allows the Google Maps JavaScript runtime in the content security policy", async () => {
    const response = await request(app).get("/health");
    const policy = response.headers["content-security-policy"];

    expect(policy).toContain("script-src 'self' https://maps.googleapis.com https://maps.gstatic.com");
    expect(policy).toContain("connect-src 'self' https://maps.googleapis.com https://maps.gstatic.com");
    expect(policy).toContain("https://*.googleapis.com");
    expect(policy).toContain("worker-src 'self' blob:");
  });

  it("keeps public registration validation available in demo mode", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "",
      email: "not-an-email",
      password: "short"
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("requires JWT for protected endpoints", async () => {
    const response = await request(app).get("/api/routes");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "認証が必要です"
      }
    });
  });
});
