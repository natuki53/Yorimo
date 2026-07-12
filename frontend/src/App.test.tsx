import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { fixtureRecommendations, fixtureRoutes, fixtureSpots } from "./test/fixtures";
import type { User } from "./lib/types";

const tokenStorageKey = "yorimo.accessToken";

const mockUser: User = {
  defaultBudgetMax: 1500,
  email: "user@yorimo.local",
  id: "user-1",
  interests: ["カフェ", "スイーツ"],
  name: "Yorimo User",
  schoolOrWorkStation: "新宿駅"
};

const mockStations = [
  {
    address: "東京都千代田区丸の内",
    id: "station-tokyo",
    lat: 35.681236,
    lng: 139.767125,
    name: "東京駅",
    primaryType: "train_station",
    types: ["train_station", "transit_station"]
  },
  {
    address: "東京都新宿区新宿",
    id: "station-shinjuku",
    lat: 35.689606,
    lng: 139.700571,
    name: "新宿駅",
    primaryType: "train_station",
    types: ["train_station", "transit_station"]
  }
];

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
    ...init
  });

const installMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches,
      media: query,
      onchange: null,
      removeEventListener: vi.fn()
    }))
  });
};

const installAuthenticatedApi = () => {
  vi.mocked(fetch).mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    if (url.endsWith("/api/auth/me") && init?.method === "PATCH") {
      const body = JSON.parse(String(init.body ?? "{}")) as Partial<User>;
      return jsonResponse({
        success: true,
        data: {
          ...mockUser,
          ...body,
          interests: body.interests ?? mockUser.interests
        }
      });
    }

    if (url.endsWith("/api/auth/me")) {
      return jsonResponse({ success: true, data: mockUser });
    }

    if (url.endsWith("/api/auth/login")) {
      return jsonResponse({ success: true, data: { token: "fresh-token", user: mockUser } });
    }

    if (url.endsWith("/api/auth/register")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as Partial<User>;
      return jsonResponse({
        success: true,
        data: {
          token: "fresh-token",
          user: {
            ...mockUser,
            ...body,
            id: "new-user-1",
            email: body.email ?? mockUser.email,
            interests: body.interests ?? mockUser.interests,
            name: body.name ?? mockUser.name
          }
        }
      });
    }

    if (url.endsWith("/api/routes")) {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body ?? "{}"));
        return jsonResponse({ success: true, data: { ...fixtureRoutes[0], ...body, id: "route-new" } }, { status: 201 });
      }
      return jsonResponse({ success: true, data: fixtureRoutes });
    }

    if (url.includes("/api/routes/")) {
      return jsonResponse({ success: true, data: { deleted: true } });
    }

    if (url.includes("/api/stations")) {
      return jsonResponse({
        success: true,
        data: { items: mockStations, total: mockStations.length }
      });
    }

    if (url.includes("/api/spots")) {
      return jsonResponse({
        success: true,
        data: { items: fixtureSpots, total: fixtureSpots.length }
      });
    }

    if (url.endsWith("/api/recommendations")) {
      return jsonResponse({ success: true, data: { items: fixtureRecommendations } });
    }

    if (url.endsWith("/api/feedback")) {
      return jsonResponse({ success: true, data: { ok: true } });
    }

    if (url.endsWith("/api/saved-spots")) {
      return jsonResponse({ success: true, data: [] });
    }

    if (url.includes("/api/saved-spots/")) {
      return jsonResponse({ success: true, data: { deleted: true } });
    }

    if (url.endsWith("/api/feed")) {
      return jsonResponse({ success: true, data: [] });
    }

    if (url.endsWith("/api/posts")) {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body ?? "{}"));
        return jsonResponse({
          success: true,
          data: {
            ...body,
            createdAt: new Date().toISOString(),
            id: "post-new",
            moodTags: body.moodTags ?? [],
            updatedAt: new Date().toISOString(),
            user: { id: mockUser.id, name: mockUser.name },
            userId: mockUser.id,
            visibility: body.visibility ?? "public"
          }
        }, { status: 201 });
      }
      return jsonResponse({ success: true, data: { items: [], total: 0 } });
    }

    return jsonResponse(
      { success: false, error: { code: "NOT_FOUND", message: "Not found" } },
      { status: 404 }
    );
  });
};

describe("Yorimo frontend", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/");
    installMatchMedia(true);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requires authentication before rendering the map experience", async () => {
    render(<App />);

    const gate = await screen.findByTestId("auth-gate");
    expect(gate).toBeInTheDocument();
    expect(within(gate).getByRole("button", { name: "ログイン" })).toBeInTheDocument();
    expect(screen.queryByTestId("desktop-experience")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mobile-experience")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "地図" })).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("switches the auth gate to registration", async () => {
    const user = userEvent.setup();
    render(<App />);

    const gate = await screen.findByTestId("auth-gate");
    await user.click(within(gate).getByRole("tab", { name: "新規登録" }));

    expect(within(gate).getByLabelText("表示名")).toBeInTheDocument();
    expect(within(gate).getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(within(gate).getByLabelText("パスワード")).toBeInTheDocument();
    expect(within(gate).getByRole("button", { name: "アカウント作成" })).toBeInTheDocument();
  });

  it("shows account setup after registration and saves profile fields separately from routes", async () => {
    const user = userEvent.setup();
    installAuthenticatedApi();

    render(<App />);

    const gate = await screen.findByTestId("auth-gate");
    await user.click(within(gate).getByRole("tab", { name: "新規登録" }));
    await user.type(within(gate).getByLabelText("表示名"), "New User");
    await user.type(within(gate).getByLabelText("メールアドレス"), "new@yorimo.local");
    await user.type(within(gate).getByLabelText("パスワード"), "password123");
    await user.click(within(gate).getByRole("button", { name: "アカウント作成" }));

    const setup = await screen.findByTestId("account-setup");
    expect(screen.queryByTestId("desktop-experience")).not.toBeInTheDocument();
    expect(within(setup).queryByLabelText("自宅の最寄り駅")).not.toBeInTheDocument();
    expect(within(setup).queryByLabelText("学校・職場の最寄り駅")).not.toBeInTheDocument();

    await user.selectOptions(within(setup).getByLabelText("年代"), "20代");
    await user.click(within(setup).getByRole("button", { name: "プロフィール登録へ" }));

    await user.click(await within(setup).findByRole("button", { name: "本屋" }));
    await user.clear(within(setup).getByLabelText("最高予算"));
    await user.type(within(setup).getByLabelText("最高予算"), "2200");
    await user.click(within(setup).getByRole("button", { name: "保存してはじめる" }));

    expect(await screen.findByTestId("desktop-experience")).toBeInTheDocument();

    const registerCall = vi
      .mocked(fetch)
      .mock.calls.find(([input]) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        return url.endsWith("/api/auth/register");
      });
    expect(registerCall).toBeDefined();

    const requestBody = JSON.parse(String(registerCall?.[1]?.body ?? "{}"));
    expect(requestBody).toMatchObject({
      email: "new@yorimo.local",
      name: "New User",
      password: "password123"
    });
    expect(requestBody).not.toHaveProperty("ageRange");
    expect(requestBody).not.toHaveProperty("interests");

    const profileCall = vi
      .mocked(fetch)
      .mock.calls.find(([input, init]) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        return url.endsWith("/api/auth/me") && init?.method === "PATCH";
      });
    expect(profileCall).toBeDefined();

    const profileBody = JSON.parse(String(profileCall?.[1]?.body ?? "{}"));
    expect(profileBody).toMatchObject({
      ageRange: "20代",
      defaultBudgetMax: 2200,
      defaultBudgetMin: 0
    });
    expect(profileBody).not.toHaveProperty("homeStation");
    expect(profileBody).not.toHaveProperty("schoolOrWorkStation");
    expect(profileBody.interests).toEqual(expect.arrayContaining(["カフェ", "スイーツ", "本屋"]));
  });

  it("shows backend login failures in the auth gate", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Invalid credentials" }
        },
        { status: 401 }
      )
    );

    render(<App />);

    const gate = await screen.findByTestId("auth-gate");
    await user.type(within(gate).getByLabelText("メールアドレス"), "user@yorimo.local");
    await user.type(within(gate).getByLabelText("パスワード"), "wrong-password");
    await user.click(within(gate).getByRole("button", { name: "ログイン" }));

    expect(await within(gate).findByText("ログインできませんでした。メールアドレスとパスワードを確認してください。")).toBeInTheDocument();
  });

  it("renders the desktop planning layout after session validation", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(tokenStorageKey, "stored-token");
    installAuthenticatedApi();

    render(<App />);

    expect(await screen.findByTestId("desktop-experience")).toBeInTheDocument();
    expect(screen.queryByTestId("auth-gate")).not.toBeInTheDocument();
    expect(screen.getByText("帰り道で寄れる場所を絞る")).toBeInTheDocument();
    expect(screen.getByTestId("desktop-map-page")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/map");

    const nav = screen.getByRole("navigation", { name: "メインナビゲーション" });
    await user.click(within(nav).getByRole("link", { name: "おすすめ" }));

    expect(window.location.pathname).toBe("/recommendations");
    expect(await screen.findByTestId("desktop-recommendations-page")).toBeInTheDocument();
    expect(screen.queryByTestId("desktop-map-page")).not.toBeInTheDocument();
    expect(await screen.findByText(/最短 \d+(m|km)/)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getAllByText("東京駅前ブックカフェ").length).toBeGreaterThan(0);
  });

  it("renders the mobile map as a separate authenticated experience", async () => {
    installMatchMedia(false);
    window.localStorage.setItem(tokenStorageKey, "stored-token");
    installAuthenticatedApi();

    render(<App />);

    expect(await screen.findByTestId("mobile-experience")).toBeInTheDocument();
    expect(screen.getByText("寄り道候補")).toBeInTheDocument();
    expect(screen.queryByTestId("desktop-experience")).not.toBeInTheDocument();
  });
});
