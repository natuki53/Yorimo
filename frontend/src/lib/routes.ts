import type { Route, RouteEndpointType, RouteTravelMode } from "./types";

export const routeEndpointTypeOptions: Array<{ value: RouteEndpointType; label: string }> = [
  { value: "station", label: "駅" },
  { value: "pin", label: "ピン" }
];

export const routeTravelModeOptions: Array<{ value: RouteTravelMode; label: string }> = [
  { value: "transit", label: "電車" },
  { value: "driving", label: "車" },
  { value: "walking", label: "徒歩" },
  { value: "bicycling", label: "自転車" }
];

export const routeEndpointLabel = (value?: RouteEndpointType) =>
  routeEndpointTypeOptions.find((option) => option.value === value)?.label ?? "駅";

export const routeTravelModeLabel = (value?: RouteTravelMode) =>
  routeTravelModeOptions.find((option) => option.value === value)?.label ?? "電車";

export const formatRouteEndpoints = (route: Route) =>
  `${routeEndpointLabel(route.startType)}:${route.startName} -> ${routeEndpointLabel(route.endType)}:${route.endName}`;

export const formatRouteWithMode = (route: Route) =>
  `${formatRouteEndpoints(route)} / ${routeTravelModeLabel(route.travelMode)}`;
