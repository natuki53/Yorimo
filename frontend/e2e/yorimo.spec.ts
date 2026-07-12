import { expect, test, type Page } from "@playwright/test";
import { fixtureRecommendations, fixtureRoutes, fixtureSpots } from "../src/test/fixtures";

const mockUser = {
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

const mapsMockScript = `
(() => {
  const google = (window.google = window.google || {});
  const maps = (google.maps = google.maps || {});
  maps.version = "e2e";
  maps.ControlPosition = { RIGHT_CENTER: "RIGHT_CENTER" };
  maps.SymbolPath = { CIRCLE: "circle" };
  maps.TransitMode = { RAIL: "RAIL", SUBWAY: "SUBWAY", TRAIN: "TRAIN", TRAM: "TRAM" };
  maps.TravelMode = { BICYCLING: "BICYCLING", DRIVING: "DRIVING", TRANSIT: "TRANSIT", WALKING: "WALKING" };
  maps.DirectionsStatus = { OK: "OK" };
  maps.Map = function Map() {
    this.fitBounds = () => {};
    this.panTo = () => {};
  };
  maps.Point = function Point(x, y) {
    this.x = x;
    this.y = y;
  };
  maps.Size = function Size(width, height) {
    this.width = width;
    this.height = height;
  };
  maps.Marker = function Marker() {
    this.addListener = () => {};
    this.setMap = () => {};
  };
  maps.Polyline = function Polyline() {
    this.setMap = () => {};
  };
  maps.TransitLayer = function TransitLayer() {
    this.setMap = () => {};
  };
  maps.LatLngBounds = function LatLngBounds() {
    this.extend = () => {};
    this.isEmpty = () => false;
  };
  maps.DirectionsRenderer = function DirectionsRenderer() {
    this.setMap = () => {};
    this.setDirections = () => {};
  };
  maps.DirectionsService = function DirectionsService() {
    this.route = (_request, callback) => callback({ routes: [{ summary: "e2e route" }] }, "OK");
  };
  maps.importLibrary = async () => maps;
  if (typeof maps.__ib__ === "function") {
    maps.__ib__();
  }
})();
`;

const installApiMocks = async (page: Page) => {
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (url.startsWith("https://maps.googleapis.com/maps/api/js")) {
      await route.fulfill({
        contentType: "application/javascript",
        body: mapsMockScript
      });
      return;
    }

    if (!url.includes("/api/")) {
      await route.continue();
      return;
    }

    const path = new URL(url).pathname;
    const fulfill = (data: unknown) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data })
      });

    if (path === "/api/auth/demo") {
      await fulfill({ token: "e2e-token", user: mockUser });
      return;
    }

    if (path === "/api/auth/me") {
      await fulfill(mockUser);
      return;
    }

    if (path === "/api/routes") {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        await fulfill({
          ...body,
          createdAt: new Date().toISOString(),
          id: "route-new",
          updatedAt: new Date().toISOString(),
          userId: mockUser.id,
          viaStationNames: body.viaStationNames ?? []
        });
        return;
      }
      await fulfill(fixtureRoutes);
      return;
    }

    if (path.startsWith("/api/routes/")) {
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON();
        await fulfill({
          ...fixtureRoutes[0],
          ...body,
          id: path.split("/").pop(),
          updatedAt: new Date().toISOString(),
          userId: mockUser.id,
          viaStationNames: body.viaStationNames ?? []
        });
        return;
      }
      await fulfill({ deleted: true });
      return;
    }

    if (path === "/api/spots") {
      await fulfill({ items: fixtureSpots, total: fixtureSpots.length });
      return;
    }

    if (path === "/api/stations") {
      const keyword = new URL(url).searchParams.get("keyword") ?? "";
      const normalizedKeyword = keyword.replace(/\s+/g, "").replace(/駅$/, "");
      const items = normalizedKeyword
        ? mockStations.filter((station) => station.name.replace(/駅$/, "").includes(normalizedKeyword))
        : mockStations;
      await fulfill({ items, total: items.length });
      return;
    }

    if (path === "/api/recommendations") {
      await fulfill({ items: fixtureRecommendations });
      return;
    }

    if (path === "/api/rail-routes") {
      await fulfill({
        points: [
          { lat: fixtureRoutes[0].startLat, lng: fixtureRoutes[0].startLng },
          { lat: 35.685, lng: 139.74 },
          { lat: fixtureRoutes[0].endLat, lng: fixtureRoutes[0].endLng }
        ],
        source: "osm",
        total: 3
      });
      return;
    }

    if (path === "/api/feedback") {
      await fulfill({ ok: true });
      return;
    }

    if (path === "/api/saved-spots") {
      await fulfill([]);
      return;
    }

    if (path.startsWith("/api/saved-spots/")) {
      await fulfill({ deleted: true });
      return;
    }

    if (path === "/api/feed") {
      await fulfill([]);
      return;
    }

    if (path === "/api/posts") {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        await fulfill({
          ...body,
          createdAt: new Date().toISOString(),
          id: "e2e-post",
          moodTags: body.moodTags ?? [],
          updatedAt: new Date().toISOString(),
          user: { id: mockUser.id, name: mockUser.name },
          userId: mockUser.id,
          visibility: body.visibility ?? "public"
        });
        return;
      }
      await fulfill({ items: [], total: 0 });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      status: 404,
      body: JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Not found" } })
    });
  });
};

test("map experience supports authentication entry and recommendations on the current viewport", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await installApiMocks(page);
  await page.goto("/");
  const viewportWidth = page.viewportSize()?.width ?? 390;

  const authGate = page.getByTestId("auth-gate");
  await expect(authGate).toBeVisible();
  await expect(page.getByTestId("desktop-experience")).toBeHidden();
  await expect(page.getByTestId("mobile-experience")).toBeHidden();
  await authGate.getByRole("button", { name: "デモを始める" }).first().click();

  if (viewportWidth >= 900) {
    await expect(page.getByTestId("desktop-experience")).toBeVisible();
    await expect(page.getByText("帰り道で寄れる場所を絞る")).toBeVisible();
  } else {
    await expect(page.getByTestId("mobile-experience")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "メインナビゲーション" })).toBeVisible();
    const sheetHandle = page.getByLabel("寄り道候補シートを開閉");
    await expect(sheetHandle).toBeVisible();
    await sheetHandle.click();
    await expect(page.getByText("寄り道候補")).toBeVisible();

    await sheetHandle.click();
    const sheet = page.locator(".sheet");
    await expect(sheet).toHaveAttribute("data-level", "expanded");
    await page.waitForTimeout(300);
    const [headerBox, sheetBox] = await Promise.all([page.locator(".map-header").boundingBox(), sheet.boundingBox()]);
    expect(headerBox).not.toBeNull();
    expect(sheetBox).not.toBeNull();
    expect(sheetBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height + 8);
  }

  await expect(page.getByRole("region", { name: /Google Maps 表示領域|簡易地図/ }).first()).toBeVisible();

  await page.getByRole("navigation", { name: "メインナビゲーション" }).getByRole("link", { name: "おすすめ" }).click();
  await expect(page).toHaveURL(/\/recommendations$/);
  if (viewportWidth >= 900) {
    await expect(page.getByTestId("desktop-recommendations-page")).toBeVisible();
    await expect(page.getByTestId("desktop-map-page")).toBeHidden();
  }
  await expect(page.getByText(/最短 \d+(m|km)/)).toBeVisible();
  await expect(page.getByText("東京駅前ブックカフェ").first()).toBeVisible();

  await page
    .locator("article")
    .filter({ hasText: "東京駅前ブックカフェ" })
    .first()
    .getByRole("button", { name: /東京駅前ブックカフェ/ })
    .click();
  if (viewportWidth >= 900) {
    await expect(page.getByLabel("詳細パネル").getByRole("button", { name: "ここに寄る" })).toBeVisible();
  } else {
    await expect(page.getByText("保存する")).toBeVisible();
  }

  expect(consoleErrors).toEqual([]);
});

test("profile route creation uses selected station coordinates from the route form", async ({ page }) => {
  await installApiMocks(page);
  await page.addInitScript(() => window.localStorage.setItem("yorimo.accessToken", "e2e-token"));
  await page.goto("/profile");

  await expect(page.getByText("駅指定とマイルート")).toBeVisible();
  await expect(page.getByLabel("自宅の最寄り駅")).toHaveCount(0);
  await expect(page.getByLabel("学校・職場の最寄り駅")).toHaveCount(0);
  await page.getByText("駅指定とマイルート").scrollIntoViewIfNeeded();

  await page.getByLabel("ルート名").fill("駅選択ルート");
  await page.getByLabel("出発駅").fill("東京");
  await page.locator(".station-option").filter({ hasText: "東京駅" }).first().click();
  await page.getByLabel("到着駅").fill("新宿");
  await page.locator(".station-option").filter({ hasText: "新宿駅" }).first().click();
  await expect(page.getByLabel("出発駅")).toHaveValue("東京駅");
  await expect(page.getByLabel("到着駅")).toHaveValue("新宿駅");

  const routeRequestPromise = page.waitForRequest(
    (request) => request.method() === "POST" && new URL(request.url()).pathname === "/api/routes"
  );
  await page.getByRole("button", { name: "マイルートを追加" }).click();
  const routeRequest = await routeRequestPromise;
  const body = routeRequest.postDataJSON();

  expect(body).toMatchObject({
    endName: "新宿駅",
    endType: "station",
    name: "駅選択ルート",
    startName: "東京駅",
    startLat: 35.681236,
    startLng: 139.767125,
    startType: "station",
    travelMode: "transit"
  });
  expect(body.endLat).toBeCloseTo(35.689606, 5);
  expect(body.endLng).toBeCloseTo(139.700571, 5);
});

test("profile route creation supports pin endpoints and driving mode", async ({ page }) => {
  await installApiMocks(page);
  await page.addInitScript(() => window.localStorage.setItem("yorimo.accessToken", "e2e-token"));
  await page.goto("/profile");

  await expect(page.getByText("駅指定とマイルート")).toBeVisible();
  await page.getByText("駅指定とマイルート").scrollIntoViewIfNeeded();
  await page.getByLabel("ルート名").fill("ピン帰り道");
  await page.getByLabel("移動手段").getByRole("button", { name: "車", exact: true }).click();

  const startEditor = page.locator(".route-point-editor").filter({ hasText: "出発指定" });
  await startEditor.getByRole("button", { name: "ピン", exact: true }).click();
  await startEditor.getByLabel("出発ピン名").fill("学校の正門");
  await startEditor.getByLabel("緯度").fill("35.681");
  await startEditor.getByLabel("経度").fill("139.767");

  const endEditor = page.locator(".route-point-editor").filter({ hasText: "到着指定" });
  await endEditor.getByRole("button", { name: "ピン", exact: true }).click();
  await endEditor.getByLabel("到着ピン名").fill("自宅前");
  await endEditor.getByLabel("緯度").fill("35.689");
  await endEditor.getByLabel("経度").fill("139.700");

  const routeRequestPromise = page.waitForRequest(
    (request) => request.method() === "POST" && new URL(request.url()).pathname === "/api/routes"
  );
  await page.getByRole("button", { name: "マイルートを追加" }).click();
  const routeRequest = await routeRequestPromise;

  expect(routeRequest.postDataJSON()).toMatchObject({
    endLat: 35.689,
    endLng: 139.7,
    endName: "自宅前",
    endType: "pin",
    name: "ピン帰り道",
    startLat: 35.681,
    startLng: 139.767,
    startName: "学校の正門",
    startType: "pin",
    travelMode: "driving"
  });
});

test("profile route creation resolves typed station names on submit", async ({ page }) => {
  await installApiMocks(page);
  await page.addInitScript(() => window.localStorage.setItem("yorimo.accessToken", "e2e-token"));
  await page.goto("/profile");

  await expect(page.getByText("駅指定とマイルート")).toBeVisible();
  await page.getByText("駅指定とマイルート").scrollIntoViewIfNeeded();
  await page.getByLabel("ルート名").fill("駅名だけのルート");
  await page.getByLabel("出発駅").fill("東京駅");
  await page.getByLabel("到着駅").fill("新宿駅");

  const routeRequestPromise = page.waitForRequest(
    (request) => request.method() === "POST" && new URL(request.url()).pathname === "/api/routes"
  );
  await page.getByRole("button", { name: "マイルートを追加" }).click();
  const routeRequest = await routeRequestPromise;

  expect(routeRequest.postDataJSON()).toMatchObject({
    endName: "新宿駅",
    endType: "station",
    name: "駅名だけのルート",
    startName: "東京駅",
    startType: "station",
    travelMode: "transit"
  });
});
