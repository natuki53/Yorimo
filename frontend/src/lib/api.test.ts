import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./api";

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
    ...init
  });

describe("api client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("unwraps successful API responses", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        success: true,
          data: {
          user: { id: "u1", name: "Yorimo User", email: "user@yorimo.local", interests: [] },
          token: "token"
        }
      })
    );

    await expect(api.login("user@yorimo.local", "password123")).resolves.toMatchObject({
      token: "token",
      user: { email: "user@yorimo.local" }
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:4000/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "user@yorimo.local", password: "password123" })
      })
    );
  });

  it("throws an ApiError for backend error payloads", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "入力内容が正しくありません" }
        },
        { status: 400 }
      )
    );

    const promise = api.login("bad", "short");

    await expect(promise).rejects.toBeInstanceOf(ApiError);
  });

  it("builds station search requests with location bias", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: { items: [], total: 0 }
      })
    );

    await api.stations({ keyword: "東京", lat: 35.681236, lng: 139.767125, limit: 8 });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:4000/api/stations?keyword=%E6%9D%B1%E4%BA%AC&lat=35.681236&lng=139.767125&limit=8",
      expect.objectContaining({ method: "GET" })
    );
  });
});
