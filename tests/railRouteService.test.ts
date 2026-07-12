import { afterEach, describe, expect, it, vi } from "vitest";
import { getRailRoutePath } from "../src/services/railRouteService.js";

describe("rail route service", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds a connected route from Overpass out geom data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            elements: [
              {
                type: "way",
                id: 10,
                nodes: [1, 2, 3],
                geometry: [
                  { lat: 35.6812, lon: 139.7671 },
                  { lat: 35.685, lon: 139.74 },
                  { lat: 35.6896, lon: 139.7006 }
                ]
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    const points = await getRailRoutePath({
      startLat: 35.68121,
      startLng: 139.76711,
      endLat: 35.68961,
      endLng: 139.70061
    });

    expect(points).toEqual([
      { lat: 35.6812, lng: 139.7671 },
      { lat: 35.685, lng: 139.74 },
      { lat: 35.6896, lng: 139.7006 }
    ]);
  });
});
