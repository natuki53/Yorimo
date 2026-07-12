import { Loader } from "@googlemaps/js-api-loader";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import type { GeoPoint, RecommendationItem, Route, RouteTravelMode, Spot } from "../lib/types";

type Props = {
  apiKey?: string;
  cameraFocusRequest?: CameraFocusRequest;
  center: { lat: number; lng: number };
  sheetLevel?: SheetLevel;
  showCurrentLocation?: boolean;
  route?: Route;
  spots: Spot[];
  recommendations: RecommendationItem[];
  selectedSpot?: Spot | null;
  onSpotSelect: (spot: Spot) => void;
};

type MapStatus = "missing-key" | "loading" | "ready" | "error";
export type SheetLevel = "collapsed" | "peek" | "expanded";
export type CameraFocusRequest =
  | { nonce: number; spotId: string; type: "selected-spot" }
  | { nonce: number; type: "current-location" };

const selectedMarkerZIndex = 10_000;

const baseMapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  clickableIcons: false,
  zoomControl: true,
  controlSize: 40,
  gestureHandling: "greedy",
  mapTypeControl: false,
  streetViewControl: false,
  styles: [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "simplified" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#d2e3fc" }] },
    { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f8f9fa" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e6f4ea" }] }
  ]
};

const createMapOptions = (google: typeof window.google): google.maps.MapOptions => ({
  ...baseMapOptions,
  zoomControlOptions: {
    position: google.maps.ControlPosition.RIGHT_CENTER
  }
});

const scoreColor = (score?: number, selected = false) => {
  if (selected) return "#e1306c";
  if (score == null) return "#34a853";
  if (score >= 85) return "#e1306c";
  if (score >= 75) return "#1a73e8";
  return "#6f42c1";
};

const buildCircleIcon = (google: typeof window.google, color: string, scale: number): google.maps.Symbol => ({
  path: google.maps.SymbolPath.CIRCLE,
  fillColor: color,
  fillOpacity: 1,
  strokeColor: "#ffffff",
  strokeWeight: 3,
  scale
});

const mixHex = (hex: string, target: string, weight: number) => {
  const parse = (value: string) => ({
    r: Number.parseInt(value.slice(1, 3), 16),
    g: Number.parseInt(value.slice(3, 5), 16),
    b: Number.parseInt(value.slice(5, 7), 16)
  });
  const from = parse(hex);
  const to = parse(target);
  const channel = (start: number, end: number) => Math.round(start + (end - start) * weight).toString(16).padStart(2, "0");
  return `#${channel(from.r, to.r)}${channel(from.g, to.g)}${channel(from.b, to.b)}`;
};

const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const buildSpotPinIcon = (google: typeof window.google, color: string, selected: boolean): google.maps.Icon => {
  const width = selected ? 42 : 34;
  const height = selected ? 50 : 42;
  const darkColor = mixHex(color, "#0f1419", 0.24);
  const glowColor = selected ? "#ffffff" : "#e8eef8";
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pinFill" x1="7" y1="5" x2="${width - 5}" y2="${height - 4}" gradientUnits="userSpaceOnUse">
          <stop stop-color="${color}"/>
          <stop offset="1" stop-color="${darkColor}"/>
        </linearGradient>
        <filter id="shadow" x="-40%" y="-35%" width="180%" height="190%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.28"/>
        </filter>
      </defs>
      <path
        filter="url(#shadow)"
        d="M${width / 2} ${height - 4}C${width / 2} ${height - 4} ${width - 6} ${height * 0.5} ${width - 6} ${width * 0.48}C${width - 6} ${width * 0.23} ${width * 0.77} 5 ${width / 2} 5C${width * 0.23} 5 6 ${width * 0.23} 6 ${width * 0.48}C6 ${height * 0.5} ${width / 2} ${height - 4} ${width / 2} ${height - 4}Z"
        fill="url(#pinFill)"
        stroke="${glowColor}"
        stroke-width="${selected ? 4 : 3}"
      />
      <circle cx="${width / 2}" cy="${width * 0.48}" r="${selected ? 6.4 : 5.2}" fill="#ffffff" fill-opacity="0.94"/>
      <circle cx="${width / 2}" cy="${width * 0.48}" r="${selected ? 2.8 : 2.2}" fill="${color}"/>
    </svg>
  `.trim();

  return {
    anchor: new google.maps.Point(width / 2, height - 4),
    scaledSize: new google.maps.Size(width, height),
    url: svgDataUrl(svg)
  };
};

const routeLineOptionsByMode = (mode: RouteTravelMode): Pick<google.maps.PolylineOptions, "strokeColor" | "strokeOpacity" | "strokeWeight"> => {
  if (mode === "driving") {
    return { strokeColor: "#0f1419", strokeOpacity: 0.88, strokeWeight: 5 };
  }
  if (mode === "walking") {
    return { strokeColor: "#34a853", strokeOpacity: 0.9, strokeWeight: 5 };
  }
  if (mode === "bicycling") {
    return { strokeColor: "#f9ab00", strokeOpacity: 0.92, strokeWeight: 5 };
  }
  return { strokeColor: "#1a73e8", strokeOpacity: 0.95, strokeWeight: 6 };
};

const googleTravelModeFor = (google: typeof window.google, mode: RouteTravelMode): google.maps.TravelMode => {
  if (mode === "driving") {
    return google.maps.TravelMode.DRIVING;
  }
  if (mode === "walking") {
    return google.maps.TravelMode.WALKING;
  }
  if (mode === "bicycling") {
    return google.maps.TravelMode.BICYCLING;
  }
  return google.maps.TravelMode.TRANSIT;
};

const transitModesFor = (google: typeof window.google): google.maps.TransitModeString[] => [
  google.maps.TransitMode.RAIL,
  google.maps.TransitMode.SUBWAY,
  google.maps.TransitMode.TRAIN,
  google.maps.TransitMode.TRAM
];

const routePath = (
  center: GeoPoint,
  route?: Route,
  selectedSpot?: Spot | null,
  topSpot?: Spot
) => {
  const target = selectedSpot ?? topSpot;
  const path: GeoPoint[] = [];

  if (route) {
    path.push({ lat: route.startLat, lng: route.startLng });
  } else {
    path.push(center);
  }

  if (target) {
    path.push({ lat: target.lat, lng: target.lng });
  }

  if (route) {
    path.push({ lat: route.endLat, lng: route.endLng });
  }

  return path;
};

const registeredRoutePath = (route: Route) => [
  { lat: route.startLat, lng: route.startLng },
  { lat: route.endLat, lng: route.endLng }
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const directionStationQuery = (stationName: string) => {
  const trimmed = stationName.trim();
  const stationLabel = trimmed.endsWith("駅") ? trimmed : `${trimmed}駅`;
  return `${stationLabel}, 日本`;
};

const directionLocationFor = (route: Route, point: "start" | "end") => {
  const isStart = point === "start";
  const type = isStart ? route.startType : route.endType;
  const name = isStart ? route.startName : route.endName;
  const location = isStart
    ? { lat: route.startLat, lng: route.startLng }
    : { lat: route.endLat, lng: route.endLng };

  if (route.travelMode === "transit" && type === "station" && name.trim()) {
    return directionStationQuery(name);
  }

  return location;
};

const normalizeApiKey = (apiKey?: string) => {
  const normalized = apiKey?.trim();
  if (
    !normalized ||
    normalized === "replace-with-your-google-maps-javascript-api-key" ||
    normalized === "your-google-maps-browser-key" ||
    !/^AIza[0-9A-Za-z_-]{30,}$/.test(normalized)
  ) {
    return undefined;
  }
  return normalized;
};

function FallbackMap({ center, route, spots, selectedSpot, onSpotSelect }: Pick<Props, "center" | "route" | "spots" | "selectedSpot" | "onSpotSelect">) {
  const points = [
    center,
    ...(route ? [{ lat: route.startLat, lng: route.startLng }, { lat: route.endLat, lng: route.endLng }] : []),
    ...spots.map((spot) => ({ lat: spot.lat, lng: spot.lng }))
  ];
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latRange = Math.max(maxLat - minLat, 0.01);
  const lngRange = Math.max(maxLng - minLng, 0.01);
  const project = (point: GeoPoint) => ({
    x: 7 + ((point.lng - minLng) / lngRange) * 86,
    y: 93 - ((point.lat - minLat) / latRange) * 86
  });
  const current = project(center);
  const routeStart = route ? project({ lat: route.startLat, lng: route.startLng }) : null;
  const routeEnd = route ? project({ lat: route.endLat, lng: route.endLng }) : null;

  return (
    <div className="fallback-map" aria-label="簡易地図" role="region">
      <div className="fallback-map-notice">簡易地図で表示中</div>
      <svg aria-hidden="true" className="fallback-map-canvas" preserveAspectRatio="none" viewBox="0 0 100 100">
        <path className="fallback-road road-a" d="M-5 72 C 18 55, 36 80, 105 24" />
        <path className="fallback-road road-b" d="M4 10 C 35 38, 64 30, 96 92" />
        <path className="fallback-road road-c" d="M-5 40 C 24 44, 70 68, 106 57" />
        {routeStart && routeEnd ? <path className="fallback-route" d={`M ${routeStart.x} ${routeStart.y} L ${routeEnd.x} ${routeEnd.y}`} /> : null}
      </svg>
      <span className="fallback-current" style={{ left: `${current.x}%`, top: `${current.y}%` }} title="現在地" />
      {spots.map((spot, index) => {
        const position = project(spot);
        return (
          <button
            aria-label={spot.name}
            className={`fallback-marker ${selectedSpot?.id === spot.id ? "selected" : ""}`}
            key={spot.id}
            onClick={() => onSpotSelect(spot)}
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            title={spot.name}
            type="button"
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  );
}

export function GoogleMapCanvas({
  apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  cameraFocusRequest,
  center,
  sheetLevel = "collapsed",
  showCurrentLocation = true,
  route,
  spots,
  recommendations,
  selectedSpot,
  onSpotSelect
}: Props) {
  const effectiveApiKey = normalizeApiKey(apiKey);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const googleMap = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);
  const routeLine = useRef<google.maps.Polyline | null>(null);
  const transitLayer = useRef<google.maps.TransitLayer | null>(null);
  const directionsRenderers = useRef<google.maps.DirectionsRenderer[]>([]);
  const renderVersion = useRef(0);
  const railPathCache = useRef(new Map<string, GeoPoint[]>());
  const railPathRequests = useRef(new Map<string, Promise<GeoPoint[]>>());
  const [mapStatus, setMapStatus] = useState<MapStatus>(effectiveApiKey ? "loading" : "missing-key");
  const sortedSpots = useMemo(() => {
    const scoreBySpot = new Map(recommendations.map((item) => [item.spot.id, item.yorimichiScore]));
    return [...spots].sort((a, b) => (scoreBySpot.get(b.id) ?? 0) - (scoreBySpot.get(a.id) ?? 0));
  }, [recommendations, spots]);
  const topSpot = recommendations[0]?.spot ?? sortedSpots[0];
  const routeWaypointSpot = route?.travelMode === "transit" ? undefined : selectedSpot ?? topSpot;
  const getCameraInsets = useCallback(() => {
    const mapElement = mapRef.current;
    const container = mapElement?.closest(".map-screen") ?? mapElement?.parentElement;
    const containerRect = container?.getBoundingClientRect();
    if (!containerRect) {
      return { bottom: 72, left: 44, right: 44, top: 96 };
    }

    let top = 24;
    container?.querySelectorAll(".map-header, .map-search-form").forEach((element) => {
      const rect = element.getBoundingClientRect();
      const overlapsContainer = rect.bottom > containerRect.top && rect.top < containerRect.bottom;
      if (overlapsContainer) {
        top = Math.max(top, rect.bottom - containerRect.top + 16);
      }
    });

    let bottom = 44;
    const sheet = container?.querySelector<HTMLElement>(".sheet");
    if (sheet) {
      const rect = sheet.getBoundingClientRect();
      const visibleHeight = Math.max(0, containerRect.bottom - clamp(rect.top, containerRect.top, containerRect.bottom));
      bottom = Math.max(bottom, visibleHeight + 14);
    }

    return {
      bottom,
      left: 44,
      right: 44,
      top
    };
  }, []);
  const fitBoundsWithInsets = useCallback(
    (bounds: google.maps.LatLngBounds) => {
      const map = googleMap.current;
      if (!map || bounds.isEmpty()) {
        return;
      }

      map.fitBounds(bounds, getCameraInsets());
    },
    [getCameraInsets]
  );
  const focusPointInVisibleArea = useCallback(
    (point: GeoPoint, zoom: number) => {
      const map = googleMap.current;
      const mapElement = mapRef.current;
      if (!map || !mapElement) {
        return undefined;
      }

      const focusOnce = () => {
        const currentZoom = map.getZoom?.();
        if (currentZoom == null || currentZoom < zoom) {
          map.setZoom?.(zoom);
        }
        map.panTo(point);
        window.requestAnimationFrame(() => {
          const container = mapElement.closest(".map-screen") ?? mapElement.parentElement;
          const containerRect = container?.getBoundingClientRect();
          if (!containerRect) {
            return;
          }

          const insets = getCameraInsets();
          const visibleHeight = containerRect.height - insets.top - insets.bottom;
          if (visibleHeight <= 40) {
            return;
          }
          const mapCenterY = containerRect.height / 2;
          const visibleCenterY = insets.top + visibleHeight / 2;
          const yOffset = clamp(mapCenterY - visibleCenterY, -180, 260);
          if (Math.abs(yOffset) > 1) {
            map.panBy?.(0, yOffset);
          }
        });
      };

      focusOnce();
      const transitionTimer = window.setTimeout(focusOnce, 260);
      return () => window.clearTimeout(transitionTimer);
    },
    [getCameraInsets]
  );
  const getRailPath = useCallback((targetRoute: Route) => {
    const cacheKey = [
      targetRoute.startLat.toFixed(5),
      targetRoute.startLng.toFixed(5),
      targetRoute.endLat.toFixed(5),
      targetRoute.endLng.toFixed(5)
    ].join(":");
    const cached = railPathCache.current.get(cacheKey);
    if (cached) {
      return Promise.resolve(cached);
    }

    const activeRequest = railPathRequests.current.get(cacheKey);
    if (activeRequest) {
      return activeRequest;
    }

    const request = Promise.resolve(
      api.railRoute({
        startLat: targetRoute.startLat,
        startLng: targetRoute.startLng,
        endLat: targetRoute.endLat,
        endLng: targetRoute.endLng
      })
    )
      .then((payload) => {
        const points = payload?.points ?? [];
        if (points.length >= 2) {
          railPathCache.current.set(cacheKey, points);
        }
        return points;
      })
      .catch(() => [])
      .finally(() => {
        railPathRequests.current.delete(cacheKey);
      });

    railPathRequests.current.set(cacheKey, request);
    return request;
  }, []);

  useEffect(() => {
    if (!effectiveApiKey) {
      setMapStatus("missing-key");
      return;
    }

    if (!mapRef.current || googleMap.current) {
      return;
    }

    let isCancelled = false;
    const loader = new Loader({
      apiKey: effectiveApiKey,
      language: "ja",
      region: "JP",
      version: "weekly"
    });

    loader
      .load()
      .then((google) => {
        if (isCancelled || !mapRef.current) {
          return;
        }

        googleMap.current = new google.maps.Map(mapRef.current, {
          ...createMapOptions(google),
          center,
          zoom: 14
        });
        setMapStatus("ready");
      })
      .catch(() => {
        if (!isCancelled) {
          setMapStatus("error");
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [effectiveApiKey, center]);

  useEffect(() => {
    const map = googleMap.current;
    if (mapStatus !== "ready" || !map || !window.google) {
      return;
    }

    markers.current.forEach((marker) => marker.setMap(null));
    markers.current = [];

    const scoreBySpot = new Map(recommendations.map((item) => [item.spot.id, item.yorimichiScore]));
    if (showCurrentLocation) {
      markers.current.push(
        new window.google.maps.Marker({
          position: center,
          map,
          title: "現在地",
          label: { text: "現在", color: "#ffffff", fontSize: "10px", fontWeight: "800" },
          icon: buildCircleIcon(window.google, "#1a73e8", 14)
        })
      );
    }

    if (route) {
      const endpoints = [
        { title: route.startName, text: "発", position: { lat: route.startLat, lng: route.startLng } },
        { title: route.endName, text: "着", position: { lat: route.endLat, lng: route.endLng } }
      ];

      endpoints.forEach((endpoint) => {
        markers.current.push(
          new window.google.maps.Marker({
            position: endpoint.position,
            map,
            title: endpoint.title,
            label: { text: endpoint.text, color: "#1a73e8", fontSize: "11px", fontWeight: "800" },
            icon: buildCircleIcon(window.google, "#ffffff", 11)
          })
        );
      });
    }

    sortedSpots.forEach((spot) => {
      const score = scoreBySpot.get(spot.id);
      const isSelected = spot.id === selectedSpot?.id;
      const position = { lat: spot.lat, lng: spot.lng };
      const marker = new window.google.maps.Marker({
        position,
        map,
        title: spot.name,
        icon: buildSpotPinIcon(window.google, scoreColor(score, isSelected), isSelected),
        zIndex: isSelected ? selectedMarkerZIndex : score ?? 1
      });

      marker.addListener("click", () => onSpotSelect(spot));
      markers.current.push(marker);
    });
  }, [center, mapStatus, onSpotSelect, recommendations, route, selectedSpot?.id, showCurrentLocation, sortedSpots]);

  useEffect(() => {
    const map = googleMap.current;
    if (mapStatus !== "ready" || !map || !window.google) {
      return;
    }

    routeLine.current?.setMap(null);
    routeLine.current = null;
    transitLayer.current?.setMap(null);
    transitLayer.current = null;
    directionsRenderers.current.forEach((renderer) => renderer.setMap(null));
    directionsRenderers.current = [];
    const currentRenderVersion = renderVersion.current + 1;
    renderVersion.current = currentRenderVersion;

    const bounds = new window.google.maps.LatLngBounds();
    const drawPolyline = (path: GeoPoint[], mode: RouteTravelMode) => {
      path.forEach((point) => bounds.extend(point));
      routeLine.current?.setMap(null);
      routeLine.current = new window.google.maps.Polyline({
        path,
        geodesic: mode !== "transit",
        ...routeLineOptionsByMode(mode),
        map
      });
      fitBoundsWithInsets(bounds);
    };

    if (!route) {
      const path = showCurrentLocation ? routePath(center, undefined, routeWaypointSpot) : [];
      if (path.length >= 2) {
        drawPolyline(path, "walking");
      }
      return;
    }

    const waypointSpot = routeWaypointSpot;
    const travelMode = route.travelMode ?? "transit";
    const path = travelMode === "transit" ? registeredRoutePath(route) : routePath(center, route, routeWaypointSpot);
    path.forEach((point) => bounds.extend(point));
    fitBoundsWithInsets(bounds);

    const googleTravelMode = googleTravelModeFor(window.google, travelMode);
    const routeLineOptions = routeLineOptionsByMode(travelMode);
    const service = new window.google.maps.DirectionsService();
    const createRenderer = () =>
      new window.google.maps.DirectionsRenderer({
        preserveViewport: true,
        suppressMarkers: true,
        polylineOptions: routeLineOptions
      });

    const sendRequest = (
      request: google.maps.DirectionsRequest,
      renderer: google.maps.DirectionsRenderer,
      onDone?: (ok: boolean) => void
    ) => {
      renderer.setMap(map);
      directionsRenderers.current.push(renderer);
      service.route(request, (result, status) => {
        if (renderVersion.current !== currentRenderVersion) {
          return;
        }

        if (status === window.google.maps.DirectionsStatus.OK && result) {
          renderer.setDirections(result);
          onDone?.(true);
          return;
        }

        renderer.setMap(null);
        onDone?.(false);
      });
    };

    const buildDirectionsRequest = (preferRail: boolean): google.maps.DirectionsRequest => {
      const transitOptions =
        travelMode === "transit"
          ? {
              departureTime: new Date(),
              ...(preferRail ? { modes: transitModesFor(window.google) } : {})
            }
          : undefined;

      return {
        destination: directionLocationFor(route, "end"),
        origin: directionLocationFor(route, "start"),
        optimizeWaypoints: false,
        provideRouteAlternatives: false,
        region: "jp",
        transitOptions,
        travelMode: googleTravelMode,
        waypoints:
          waypointSpot && travelMode !== "transit"
            ? [{ location: { lat: waypointSpot.lat, lng: waypointSpot.lng }, stopover: true }]
            : undefined
      };
    };

    if (travelMode === "transit") {
      transitLayer.current = new window.google.maps.TransitLayer();
      transitLayer.current.setMap(map);
      void getRailPath(route).then((points) => {
        if (renderVersion.current !== currentRenderVersion || points.length < 2) {
          return;
        }

        directionsRenderers.current.forEach((renderer) => renderer.setMap(null));
        directionsRenderers.current = [];
        drawPolyline(points, "transit");
      });
    }

    const fallback = () => {
      directionsRenderers.current.forEach((renderer) => renderer.setMap(null));
      directionsRenderers.current = [];
      // Public transit must follow real rail geometry. Do not imply an
      // unavailable route by drawing a straight line between stations.
      if (travelMode !== "transit" && path.length >= 2) {
        drawPolyline(path, travelMode);
      }
    };

    sendRequest(
      buildDirectionsRequest(true),
      createRenderer(),
      (ok) => {
        if (ok) {
          return;
        }
        if (travelMode === "transit") {
          sendRequest(buildDirectionsRequest(false), createRenderer(), (retryOk) => {
            if (!retryOk) {
              fallback();
            }
          });
          return;
        }
        fallback();
      }
    );
  }, [center, fitBoundsWithInsets, getRailPath, mapStatus, route, routeWaypointSpot, showCurrentLocation]);

  useEffect(() => {
    if (mapStatus !== "ready" || !cameraFocusRequest) {
      return;
    }

    if (cameraFocusRequest.type === "selected-spot") {
      if (!selectedSpot || selectedSpot.id !== cameraFocusRequest.spotId) {
        return;
      }
      return focusPointInVisibleArea({ lat: selectedSpot.lat, lng: selectedSpot.lng }, 17);
    }

    return focusPointInVisibleArea(center, 16);
  }, [
    cameraFocusRequest,
    center,
    focusPointInVisibleArea,
    mapStatus,
    selectedSpot,
    sheetLevel
  ]);

  if (effectiveApiKey && mapStatus !== "error") {
    return (
      <div className="google-map-shell" aria-label="Google Maps 表示領域" role="region">
        <div className="google-map" ref={mapRef} role="application" aria-label="Google Maps" />
        {mapStatus === "loading" ? <div className="map-loading">Google Maps を読み込み中</div> : null}
      </div>
    );
  }

  return <FallbackMap center={center} onSpotSelect={onSpotSelect} route={route} selectedSpot={selectedSpot} spots={sortedSpots} />;
}
