import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GoogleMapCanvas } from "./GoogleMapCanvas";
import { fixtureRecommendations, fixtureRoutes, fixtureSpots, tokyoStation } from "../test/fixtures";

const loadMock = vi.fn();
const railRouteMock = vi.hoisted(() => vi.fn());

vi.mock("@googlemaps/js-api-loader", () => ({
  Loader: vi.fn().mockImplementation(() => ({
    load: loadMock
  }))
}));

vi.mock("../lib/api", () => ({
  api: {
    railRoute: railRouteMock
  }
}));

type ComputeRoutesResult = { routes?: google.maps.routes.Route[] };
type ComputeRoutesHandler = (
  request: google.maps.routes.ComputeRoutesRequest
) => ComputeRoutesResult | Promise<ComputeRoutesResult>;
type LegacyRouteCallback = (result: google.maps.DirectionsResult | null, status: string) => void;
type LegacyRouteHandler = (request: google.maps.DirectionsRequest, callback: LegacyRouteCallback) => void;

const createGoogleMock = (routeImplementation?: ComputeRoutesHandler, legacyRouteImplementation?: LegacyRouteHandler) => {
  const routePolylineSetMap = vi.fn();
  const createPolylines = vi.fn(() => [{ setMap: routePolylineSetMap }]);
  const computedRoute = {
    createPolylines,
    path: [
      { lat: () => 35.6812, lng: () => 139.7671 },
      { lat: () => 35.6896, lng: () => 139.7004 }
    ]
  } as unknown as google.maps.routes.Route;
  const computeRoutes = vi.fn().mockImplementation(async (request: google.maps.routes.ComputeRoutesRequest) => {
    if (routeImplementation) {
      return routeImplementation(request);
    }
    return { routes: [computedRoute] };
  });
  const legacyRoute = vi.fn().mockImplementation((request: google.maps.DirectionsRequest, callback: LegacyRouteCallback) => {
    if (legacyRouteImplementation) {
      legacyRouteImplementation(request, callback);
      return;
    }
    callback(null, "ZERO_RESULTS");
  });
  const directionsService = vi.fn().mockImplementation(() => ({ route: legacyRoute }));
  const importLibrary = vi.fn(async () => ({ Route: { computeRoutes } }));
  const fitBounds = vi.fn();
  const getZoom = vi.fn(() => 13);
  const panBy = vi.fn();
  const panTo = vi.fn();
  const setZoom = vi.fn();
  const map = vi.fn().mockImplementation(() => ({
    fitBounds,
    getZoom,
    panBy,
    panTo,
    setZoom
  }));
  const markerListeners: Array<Record<string, () => void>> = [];
  const marker = vi.fn().mockImplementation(() => {
    const listeners: Record<string, () => void> = {};
    markerListeners.push(listeners);

    return {
      addListener: vi.fn((eventName: string, handler: () => void) => {
        listeners[eventName] = handler;
        return { remove: vi.fn() };
      }),
      setMap: vi.fn()
    };
  });
  const polyline = vi.fn().mockImplementation(() => ({
    setMap: vi.fn()
  }));
  const transitLayerSetMap = vi.fn();
  const transitLayer = vi.fn().mockImplementation(() => ({
    setMap: transitLayerSetMap
  }));
  const boundsExtend = vi.fn();
  const bounds = vi.fn().mockImplementation(() => ({
    extend: boundsExtend,
    isEmpty: () => false
  }));

  return {
    maps: {
      ControlPosition: { RIGHT_CENTER: "RIGHT_CENTER" },
      DirectionsService: directionsService,
      DirectionsStatus: { OK: "OK" },
      importLibrary,
      LatLngBounds: bounds,
      Map: map,
      Marker: marker,
      Point: vi.fn().mockImplementation((x: number, y: number) => ({ x, y })),
      Polyline: polyline,
      Size: vi.fn().mockImplementation((width: number, height: number) => ({ height, width })),
      SymbolPath: { CIRCLE: "circle" },
      TransitLayer: transitLayer,
      TransitMode: { RAIL: "RAIL", SUBWAY: "SUBWAY", TRAIN: "TRAIN", TRAM: "TRAM" },
      TravelMode: { BICYCLING: "BICYCLING", DRIVING: "DRIVING", TRANSIT: "TRANSIT", WALKING: "WALKING" }
    },
    spies: {
      bounds,
      boundsExtend,
      computeRoutes,
      createPolylines,
      directionsService,
      fitBounds,
      getZoom,
      importLibrary,
      legacyRoute,
      map,
      marker,
      markerListeners,
      panBy,
      panTo,
      polyline,
      routePolylineSetMap,
      setZoom,
      transitLayer,
      transitLayerSetMap
    }
  };
};

describe("GoogleMapCanvas", () => {
  afterEach(() => {
    vi.clearAllMocks();
    railRouteMock.mockReset();
    Reflect.deleteProperty(window, "google");
  });

  it("uses the interactive prototype map when no Google key is available", () => {
    const onSpotSelect = vi.fn();
    render(
      <GoogleMapCanvas
        apiKey=""
        center={tokyoStation}
        onSpotSelect={onSpotSelect}
        recommendations={fixtureRecommendations}
        route={fixtureRoutes[0]}
        spots={fixtureSpots}
      />
    );

    expect(screen.getByRole("region", { name: "簡易地図" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: fixtureSpots[0].name }));
    expect(onSpotSelect).toHaveBeenCalledWith(fixtureSpots[0]);
    expect(loadMock).not.toHaveBeenCalled();
  });

  it("loads Google Maps and draws the registered transit route when an API key is provided", async () => {
    const googleMock = createGoogleMock();
    loadMock.mockResolvedValueOnce(googleMock);
    Object.defineProperty(window, "google", {
      configurable: true,
      value: googleMock
    });

    render(
      <GoogleMapCanvas
        apiKey="AIzaSyD0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D"
        center={tokyoStation}
        onSpotSelect={vi.fn()}
        recommendations={fixtureRecommendations}
        route={fixtureRoutes[0]}
        selectedSpot={fixtureSpots[0]}
        spots={fixtureSpots}
      />
    );

    await waitFor(() => expect(googleMock.spies.map).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(googleMock.spies.marker).toHaveBeenCalled());

    expect(loadMock).toHaveBeenCalledTimes(1);
    expect(googleMock.spies.map).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        controlSize: 40,
        zoomControl: true,
        zoomControlOptions: { position: "RIGHT_CENTER" }
      })
    );
    expect(googleMock.spies.computeRoutes).toHaveBeenCalledTimes(1);
    expect(googleMock.spies.computeRoutes).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: "新宿駅, 日本",
        origin: "東京駅, 日本",
        departureTime: expect.any(Date),
        fields: ["path", "legs"],
        transitPreference: expect.objectContaining({
          allowedTransitModes: ["RAIL", "SUBWAY", "TRAIN", "TRAM"]
        }),
        travelMode: "TRANSIT",
        intermediates: undefined
      })
    );
    expect(googleMock.spies.createPolylines).toHaveBeenCalledWith({
      polylineOptions: expect.objectContaining({ strokeColor: expect.any(String) })
    });
    expect(googleMock.spies.routePolylineSetMap).toHaveBeenCalledWith(expect.any(Object));
    expect(googleMock.spies.polyline).not.toHaveBeenCalled();
    expect(railRouteMock).not.toHaveBeenCalled();

    const spotMarkerOptions = googleMock.spies.marker.mock.calls.find(([options]) => options.title === fixtureSpots[0].name)?.[0];
    const otherSpotMarkerOptions = googleMock.spies.marker.mock.calls.find(([options]) => options.title === fixtureSpots[1].name)?.[0];
    expect(spotMarkerOptions).toEqual(
      expect.objectContaining({
        icon: expect.objectContaining({
          url: expect.stringContaining("data:image/svg+xml")
        }),
        title: fixtureSpots[0].name
      })
    );
    expect(spotMarkerOptions.zIndex).toBeGreaterThan(otherSpotMarkerOptions.zIndex);
    expect(spotMarkerOptions).not.toHaveProperty("label");
  });

  it("does not render a fake current-location marker before GPS is resolved", async () => {
    const googleMock = createGoogleMock();
    loadMock.mockResolvedValueOnce(googleMock);
    Object.defineProperty(window, "google", {
      configurable: true,
      value: googleMock
    });

    render(
      <GoogleMapCanvas
        apiKey="AIzaSyD0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D"
        center={tokyoStation}
        onSpotSelect={vi.fn()}
        recommendations={fixtureRecommendations}
        route={fixtureRoutes[0]}
        selectedSpot={fixtureSpots[0]}
        showCurrentLocation={false}
        spots={fixtureSpots}
      />
    );

    await waitFor(() => expect(googleMock.spies.marker).toHaveBeenCalled());

    const titles = googleMock.spies.marker.mock.calls.map(([options]) => options.title);
    expect(titles).not.toContain("現在地");
  });

  it("falls back to the legacy transit route when the Routes API has no coverage", async () => {
    const legacyPoints = [
      { lat: () => 35.6812, lng: () => 139.7671 },
      { lat: () => 35.684, lng: () => 139.741 },
      { lat: () => 35.6896, lng: () => 139.7004 }
    ];
    const googleMock = createGoogleMock(
      () => ({ routes: [] }),
      (_request, callback) =>
        callback(
          { routes: [{ overview_path: legacyPoints }] } as unknown as google.maps.DirectionsResult,
          "OK"
        )
    );
    loadMock.mockResolvedValueOnce(googleMock);
    Object.defineProperty(window, "google", { configurable: true, value: googleMock });

    render(
      <GoogleMapCanvas
        apiKey="AIzaSyD0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D"
        center={tokyoStation}
        onSpotSelect={vi.fn()}
        recommendations={fixtureRecommendations}
        route={fixtureRoutes[0]}
        spots={fixtureSpots}
      />
    );

    await waitFor(() => expect(googleMock.spies.computeRoutes).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(googleMock.spies.legacyRoute).toHaveBeenCalledTimes(1));
    expect(googleMock.spies.legacyRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        transitOptions: expect.objectContaining({
          departureTime: expect.any(Date),
          modes: ["RAIL", "SUBWAY", "TRAIN", "TRAM"]
        }),
        travelMode: "TRANSIT"
      }),
      expect.any(Function)
    );
    expect(googleMock.spies.polyline).toHaveBeenCalledWith(
      expect.objectContaining({
        path: [
          { lat: 35.6812, lng: 139.7671 },
          { lat: 35.684, lng: 139.741 },
          { lat: 35.6896, lng: 139.7004 }
        ],
        zIndex: 20
      })
    );
    expect(railRouteMock).not.toHaveBeenCalled();
  });

  it("uses bundled rail geometry for the presentation route when Google has no route", async () => {
    const googleMock = createGoogleMock(() => ({ routes: [] }));
    loadMock.mockResolvedValueOnce(googleMock);
    Object.defineProperty(window, "google", { configurable: true, value: googleMock });

    render(
      <GoogleMapCanvas
        apiKey="AIzaSyD0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D"
        center={tokyoStation}
        onSpotSelect={vi.fn()}
        recommendations={fixtureRecommendations}
        route={fixtureRoutes[0]}
        spots={fixtureSpots}
      />
    );

    await waitFor(() => expect(googleMock.spies.polyline).toHaveBeenCalled());
    const options = googleMock.spies.polyline.mock.calls.at(-1)?.[0];
    expect(options.path).toHaveLength(11);
    expect(options.path[0]).toEqual({ lat: 35.681236, lng: 139.767125 });
    expect(options.path.at(-1)).toEqual({ lat: 35.689592, lng: 139.700413 });
    expect(options).toEqual(expect.objectContaining({ geodesic: false, zIndex: 20 }));
    expect(railRouteMock).not.toHaveBeenCalled();
  });

  it("draws a rail fallback route instead of a straight line when transit directions fail", async () => {
    const nonBundledRoute = {
      ...fixtureRoutes[0],
      startLat: 35.72,
      startLng: 139.8,
      endLat: 35.66,
      endLng: 139.66
    };
    const railPoints = [
      { lat: 35.6812, lng: 139.7671 },
      { lat: 35.684, lng: 139.741 },
      { lat: 35.6896, lng: 139.7004 }
    ];
    railRouteMock.mockResolvedValueOnce({
      points: railPoints,
      source: "osm",
      total: railPoints.length
    });
    const googleMock = createGoogleMock(() => ({ routes: [] }));
    loadMock.mockResolvedValueOnce(googleMock);
    Object.defineProperty(window, "google", {
      configurable: true,
      value: googleMock
    });

    render(
      <GoogleMapCanvas
        apiKey="AIzaSyD0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D"
        center={tokyoStation}
        onSpotSelect={vi.fn()}
        recommendations={fixtureRecommendations}
        route={nonBundledRoute}
        selectedSpot={fixtureSpots[0]}
        spots={fixtureSpots}
      />
    );

    await waitFor(() => expect(googleMock.spies.map).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(googleMock.spies.computeRoutes).toHaveBeenCalledTimes(2));

    const retryRequest = googleMock.spies.computeRoutes.mock.calls[1][0] as google.maps.routes.ComputeRoutesRequest;
    expect(retryRequest.departureTime).toEqual(expect.any(Date));
    expect(retryRequest.transitPreference).toBeUndefined();
    await waitFor(() =>
      expect(googleMock.spies.polyline).toHaveBeenCalledWith(
        expect.objectContaining({
          geodesic: false,
          path: railPoints
        })
      )
    );
    expect(railRouteMock).toHaveBeenCalledWith({
      startLat: nonBundledRoute.startLat,
      startLng: nonBundledRoute.startLng,
      endLat: nonBundledRoute.endLat,
      endLng: nonBundledRoute.endLng
    });
    expect(googleMock.spies.transitLayer).toHaveBeenCalledTimes(1);
    expect(googleMock.spies.transitLayerSetMap).toHaveBeenCalledWith(expect.any(Object));
  });

  it("does not draw a misleading straight line when transit route providers fail", async () => {
    const nonBundledRoute = {
      ...fixtureRoutes[0],
      startLat: 35.72,
      startLng: 139.8,
      endLat: 35.66,
      endLng: 139.66
    };
    railRouteMock.mockResolvedValueOnce({ points: [], source: "none", total: 0 });
    const googleMock = createGoogleMock(() => ({ routes: [] }));
    loadMock.mockResolvedValueOnce(googleMock);
    Object.defineProperty(window, "google", { configurable: true, value: googleMock });

    render(
      <GoogleMapCanvas
        apiKey="AIzaSyD0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D"
        center={tokyoStation}
        onSpotSelect={vi.fn()}
        recommendations={fixtureRecommendations}
        route={nonBundledRoute}
        spots={fixtureSpots}
      />
    );

    await waitFor(() => expect(googleMock.spies.computeRoutes).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(railRouteMock).toHaveBeenCalledTimes(1));
    expect(googleMock.spies.polyline).not.toHaveBeenCalled();
  });

  it("uses road directions with a waypoint for driving routes", async () => {
    const googleMock = createGoogleMock();
    loadMock.mockResolvedValueOnce(googleMock);
    Object.defineProperty(window, "google", {
      configurable: true,
      value: googleMock
    });
    const drivingRoute = { ...fixtureRoutes[0], travelMode: "driving" as const };

    render(
      <GoogleMapCanvas
        apiKey="AIzaSyD0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D"
        center={tokyoStation}
        onSpotSelect={vi.fn()}
        recommendations={fixtureRecommendations}
        route={drivingRoute}
        selectedSpot={fixtureSpots[0]}
        spots={fixtureSpots}
      />
    );

    await waitFor(() => expect(googleMock.spies.map).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(googleMock.spies.computeRoutes).toHaveBeenCalledTimes(1));

    expect(googleMock.spies.computeRoutes).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: { lat: fixtureRoutes[0].endLat, lng: fixtureRoutes[0].endLng },
        origin: { lat: fixtureRoutes[0].startLat, lng: fixtureRoutes[0].startLng },
        travelMode: "DRIVING",
        intermediates: [
          {
            location: { lat: fixtureSpots[0].lat, lng: fixtureSpots[0].lng }
          }
        ]
      })
    );
    expect(googleMock.spies.createPolylines).toHaveBeenCalledTimes(1);
    expect(googleMock.spies.polyline).not.toHaveBeenCalled();
  });

  it("selects a spot when its marker is clicked", async () => {
    const googleMock = createGoogleMock();
    const onSpotSelect = vi.fn();
    loadMock.mockResolvedValueOnce(googleMock);
    Object.defineProperty(window, "google", {
      configurable: true,
      value: googleMock
    });

    render(
      <GoogleMapCanvas
        apiKey="AIzaSyD0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D"
        center={tokyoStation}
        onSpotSelect={onSpotSelect}
        recommendations={fixtureRecommendations}
        selectedSpot={fixtureSpots[0]}
        spots={fixtureSpots}
      />
    );

    await waitFor(() => expect(googleMock.spies.marker).toHaveBeenCalledTimes(fixtureSpots.length + 1));

    act(() => {
      googleMock.spies.markerListeners[1].click();
    });

    expect(onSpotSelect).toHaveBeenCalledWith(fixtureSpots[0]);
  });

  it("zooms and offsets the map when a spot is explicitly focused", async () => {
    const googleMock = createGoogleMock();
    loadMock.mockResolvedValueOnce(googleMock);
    Object.defineProperty(window, "google", {
      configurable: true,
      value: googleMock
    });
    const rect = (top: number, bottom: number, left = 0, right = 390) =>
      ({
        bottom,
        height: bottom - top,
        left,
        right,
        toJSON: () => ({}),
        top,
        width: right - left,
        x: left,
        y: top
      }) as DOMRect;
    const rectSpy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function getRect(this: HTMLElement) {
      if (this.classList.contains("map-screen")) return rect(0, 844);
      if (this.classList.contains("sheet")) return rect(540, 790);
      if (this.classList.contains("google-map")) return rect(0, 844);
      return rect(0, 0);
    });

    render(
      <div className="map-screen">
        <section className="sheet" data-level="peek" />
        <GoogleMapCanvas
          apiKey="AIzaSyD0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D"
          cameraFocusRequest={{ nonce: 1, spotId: fixtureSpots[0].id, type: "selected-spot" }}
          center={tokyoStation}
          onSpotSelect={vi.fn()}
          recommendations={fixtureRecommendations}
          selectedSpot={fixtureSpots[0]}
          sheetLevel="peek"
          spots={fixtureSpots}
        />
      </div>
    );

    await waitFor(() => expect(googleMock.spies.map).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(googleMock.spies.setZoom).toHaveBeenCalledWith(17));
    expect(googleMock.spies.panTo).toHaveBeenCalledWith({
      lat: fixtureSpots[0].lat,
      lng: fixtureSpots[0].lng
    });
    await waitFor(() => expect(googleMock.spies.panBy).toHaveBeenCalled());
    expect(googleMock.spies.panBy.mock.calls.at(-1)?.[1]).toBeGreaterThan(0);
    rectSpy.mockRestore();
  });
});
