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

    if (url.endsWith("/api/auth/demo")) {
      return jsonResponse({ success: true, data: { token: "fresh-token", user: mockUser } });
    }

    if (url.endsWith("/api/auth/login")) {
      return jsonResponse({ success: true, data: { token: "account-token", user: mockUser } });
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

  it("shows a one-click demo gate before rendering the map experience", async () => {
    render(<App />);

    const gate = await screen.findByTestId("auth-gate");
    expect(gate).toBeInTheDocument();
    expect(within(gate).getAllByRole("button", { name: "デモを始める" })).toHaveLength(2);
    expect(within(gate).queryByLabelText("メールアドレス")).not.toBeInTheDocument();
    expect(within(gate).queryByLabelText("パスワード")).not.toBeInTheDocument();
    expect(screen.queryByTestId("desktop-experience")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mobile-experience")).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("also supports email login from the landing page", async () => {
    const user = userEvent.setup();
    installAuthenticatedApi();
    render(<App />);

    const gate = await screen.findByTestId("auth-gate");
    await user.click(within(gate).getAllByRole("button", { name: "ログイン" })[0]);

    const dialog = await screen.findByRole("dialog", { name: "ログイン" });
    await user.type(within(dialog).getByLabelText("メールアドレス"), "user@yorimo.local");
    await user.type(within(dialog).getByLabelText("パスワード"), "password123");
    await user.click(within(dialog).getByRole("button", { name: "ログイン" }));

    expect(await screen.findByTestId("desktop-experience")).toBeInTheDocument();
    expect(window.localStorage.getItem(tokenStorageKey)).toBe("account-token");
    expect(
      vi.mocked(fetch).mock.calls.some(
        ([input, init]) => String(input).endsWith("/api/auth/login") && init?.method === "POST"
      )
    ).toBe(true);
  });

  it("offers account registration from the same auth dialog", async () => {
    const user = userEvent.setup();
    installAuthenticatedApi();
    render(<App />);

    const gate = await screen.findByTestId("auth-gate");
    await user.click(within(gate).getAllByRole("button", { name: "ログイン" })[0]);
    const dialog = await screen.findByRole("dialog", { name: "ログイン" });
    await user.click(within(dialog).getByRole("tab", { name: "新規登録" }));

    expect(await screen.findByRole("dialog", { name: "アカウント作成" })).toBeInTheDocument();
    expect(within(dialog).getByText("発表用プロトタイプです")).toBeInTheDocument();
    expect(within(dialog).getByText(/実在するメールアドレスや個人情報は入力しないでください/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText("表示名")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "アカウントを作成" })).toBeInTheDocument();
  });

  it("starts the shared demo with one click", async () => {
    const user = userEvent.setup();
    installAuthenticatedApi();
    render(<App />);

    const gate = await screen.findByTestId("auth-gate");
    await user.click(within(gate).getAllByRole("button", { name: "デモを始める" })[0]);
    expect(await screen.findByTestId("desktop-experience")).toBeInTheDocument();
    expect(window.localStorage.getItem(tokenStorageKey)).toBe("fresh-token");
    expect(vi.mocked(fetch).mock.calls.some(([input]) => String(input).endsWith("/api/auth/demo"))).toBe(true);
  });

  it("shows demo startup failures in the auth gate", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        {
          success: false,
          error: { code: "DEMO_NOT_READY", message: "Not ready" }
        },
        { status: 401 }
      )
    );

    render(<App />);

    const gate = await screen.findByTestId("auth-gate");
    await user.click(within(gate).getAllByRole("button", { name: "デモを始める" })[0]);

    expect(await within(gate).findByText("デモを開始できませんでした。少し待ってから、もう一度お試しください。")).toBeInTheDocument();
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

  it("shows the shared, read-only demo profile and protects the baseline route", async () => {
    window.history.replaceState(null, "", "/profile");
    window.localStorage.setItem(tokenStorageKey, "stored-token");
    installAuthenticatedApi();

    render(<App />);

    expect(await screen.findByTestId("desktop-experience")).toBeInTheDocument();
    expect(screen.getByText(/共有デモです/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "固定プロフィール" })).toBeInTheDocument();
    expect(screen.getByText("基準ルート")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `${fixtureRoutes[0].name}を削除` })).not.toBeInTheDocument();
  });
});
