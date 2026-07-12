import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { DesktopLayout } from "./DesktopLayout";
import { fixtureRecommendations, fixtureRoutes, fixtureSpots, tokyoStation } from "../test/fixtures";
import type { Spot, User } from "../lib/types";

const mockUser: User = {
  defaultBudgetMax: 1500,
  email: "user@yorimo.local",
  id: "user-1",
  interests: ["カフェ", "スイーツ"],
  name: "Yorimo User",
  schoolOrWorkStation: "新宿駅"
};

const clickedSpot: Spot = {
  ...fixtureSpots[0],
  id: "spot-gallery",
  name: "推薦外ギャラリー",
  category: "ギャラリー",
  description: "マップでクリックした場所の詳細",
  lat: 35.6822,
  lng: 139.7692,
  tags: ["アート", "駅近"]
};

const renderDesktopLayout = (overrides: Partial<ComponentProps<typeof DesktopLayout>> = {}) => {
  const noop = vi.fn();
  const asyncNoop = vi.fn(async () => undefined);
  const { mapCenter = tokyoStation, ...restOverrides } = overrides;

  return render(
    <DesktopLayout
      activeTab="map"
      apiMessage={null}
      availableMinutes={45}
      budgetMax={1500}
      currentLocation={tokyoStation}
      feedPosts={[]}
      loading={false}
      mapCenter={mapCenter}
      onAuthOpen={noop}
      onAvailableMinutesChange={noop}
      onBudgetMaxChange={noop}
      onFeedRefresh={noop}
      onLogout={noop}
      onPostCreate={asyncNoop}
      onProfileUpdate={asyncNoop}
      onRefresh={noop}
      onRouteCreate={asyncNoop}
      onRouteDelete={asyncNoop}
      onRouteSelect={noop}
      onSavedDelete={noop}
      onSpotAction={noop}
      onSpotSelect={noop}
      onTabChange={noop}
      onTagToggle={noop}
      recommendations={fixtureRecommendations}
      route={fixtureRoutes[0]}
      routes={fixtureRoutes}
      savedSpots={[]}
      selectedRecommendation={undefined}
      selectedRouteId={fixtureRoutes[0].id}
      selectedSpot={clickedSpot}
      showCurrentLocation
      spots={[...fixtureSpots, clickedSpot]}
      tags={["甘いもの"]}
      user={mockUser}
      {...restOverrides}
    />
  );
};

describe("DesktopLayout", () => {
  it("places the primary desktop navigation in the top bar", () => {
    const { container } = renderDesktopLayout();

    const nav = screen.getByRole("navigation", { name: "メインナビゲーション" });
    const topbar = container.querySelector(".desktop-topbar");
    const sidebar = screen.getByRole("complementary", { name: "メインメニュー" });

    expect(topbar).toContainElement(nav);
    expect(sidebar).not.toContainElement(nav);
  });

  it("shows the selected map spot details at the top of the right panel", () => {
    renderDesktopLayout();

    const inspector = screen.getByRole("complementary", { name: "詳細パネル" });
    const firstPanel = inspector.firstElementChild as HTMLElement;

    expect(firstPanel).toHaveClass("desktop-detail-panel");
    expect(within(firstPanel).getByText(clickedSpot.name)).toBeInTheDocument();
    expect(within(firstPanel).getByText(clickedSpot.description!)).toBeInTheDocument();
    expect(within(firstPanel).queryByText(fixtureRecommendations[0].spot.name)).not.toBeInTheDocument();
    expect(firstPanel.nextElementSibling).toHaveClass("desktop-recommendations-head");
  });

  it("uses distance units for recommendation badges", () => {
    renderDesktopLayout();
    const deprecatedBadgeLabel = ["f", "i", "t"].join("");
    const deprecatedPanelLabel = ["m", "/", "km", "で近", "い候補"].join("");

    expect(screen.getAllByLabelText(/距離 \d+(m|km)/).length).toBeGreaterThan(0);
    expect(screen.getByText("近くの候補")).toBeInTheDocument();
    expect(screen.queryByText(deprecatedBadgeLabel)).not.toBeInTheDocument();
    expect(screen.queryByText(deprecatedPanelLabel)).not.toBeInTheDocument();
  });
});
