import { describe, expect, it } from "vitest";
import { scoreRouteFit } from "../src/services/recommendationService.js";

const stationRoute = {
  startType: "station" as const,
  startName: "東京駅",
  startLat: 35.681236,
  startLng: 139.767125,
  endType: "station" as const,
  endName: "新宿駅",
  endLat: 35.689592,
  endLng: 139.700413,
  travelMode: "transit" as const,
  viaStationNames: ["神田", "御茶ノ水", "四ツ谷"]
};

describe("scoreRouteFit", () => {
  it("prioritizes spots whose station is included in route via stations", () => {
    const current = { lat: 35.69169, lng: 139.77088 };
    const spotLocation = { lat: 35.69169, lng: 139.77088 };

    const viaStationScore = scoreRouteFit(
      { ...spotLocation, stationName: "神田" },
      current,
      stationRoute
    );
    const differentStationScore = scoreRouteFit(
      { ...spotLocation, stationName: "秋葉原" },
      current,
      stationRoute
    );

    expect(viaStationScore).toBeGreaterThanOrEqual(90);
    expect(differentStationScore).toBeLessThan(70);
  });

  it("normalizes the station suffix when matching endpoint stations", () => {
    const current = { lat: stationRoute.startLat, lng: stationRoute.startLng };

    const score = scoreRouteFit(
      { lat: stationRoute.startLat, lng: stationRoute.startLng, stationName: "東京" },
      current,
      stationRoute
    );

    expect(score).toBe(100);
  });

  it("uses geometry instead of station matching for road-based routes", () => {
    const current = { lat: stationRoute.startLat, lng: stationRoute.startLng };
    const score = scoreRouteFit(
      { lat: 35.75, lng: 139.55, stationName: "神田" },
      current,
      { ...stationRoute, travelMode: "driving" }
    );

    expect(score).toBeLessThan(70);
  });
});
