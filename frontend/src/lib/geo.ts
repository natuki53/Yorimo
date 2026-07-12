import type { Route } from "./types";

export type GeoPoint = {
  lat: number;
  lng: number;
};

const earthRadiusKm = 6371;
const toRad = (degree: number) => (degree * Math.PI) / 180;

export const distanceKm = (from: GeoPoint, to: GeoPoint) => {
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const pointToSegmentDistanceKm = (point: GeoPoint, start: GeoPoint, end: GeoPoint) => {
  const originLat = toRad((start.lat + end.lat + point.lat) / 3);
  const project = (value: GeoPoint) => ({
    x: earthRadiusKm * toRad(value.lng) * Math.cos(originLat),
    y: earthRadiusKm * toRad(value.lat)
  });

  const p = project(point);
  const a = project(start);
  const b = project(end);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return distanceKm(point, start);
  }

  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  const closest = { x: a.x + t * dx, y: a.y + t * dy };
  const distanceX = p.x - closest.x;
  const distanceY = p.y - closest.y;

  return Math.sqrt(distanceX * distanceX + distanceY * distanceY);
};

export const recommendationDistanceKm = (spot: GeoPoint, currentLocation: GeoPoint, route?: Route) => {
  const currentDistance = distanceKm(currentLocation, spot);

  if (!route) {
    return currentDistance;
  }

  const routeDistance = pointToSegmentDistanceKm(
    spot,
    { lat: route.startLat, lng: route.startLng },
    { lat: route.endLat, lng: route.endLng }
  );

  return Math.min(currentDistance, routeDistance);
};

export type DistanceParts = {
  value: string;
  unit: "m" | "km";
};

export const formatDistanceParts = (kilometers: number): DistanceParts | null => {
  if (!Number.isFinite(kilometers)) {
    return null;
  }

  if (kilometers < 1) {
    const meters = kilometers * 1000;
    const roundedMeters = meters < 100 ? Math.max(10, Math.round(meters / 10) * 10) : Math.round(meters / 50) * 50;
    return { value: roundedMeters.toLocaleString(), unit: "m" };
  }

  if (kilometers < 10) {
    return { value: kilometers.toFixed(1), unit: "km" };
  }

  return { value: Math.round(kilometers).toLocaleString(), unit: "km" };
};

export const formatDistance = (kilometers: number) => {
  const parts = formatDistanceParts(kilometers);

  return parts ? `${parts.value}${parts.unit}` : "";
};

export const formatRecommendationDistance = (spot: GeoPoint, currentLocation: GeoPoint, route?: Route) =>
  formatDistance(recommendationDistanceKm(spot, currentLocation, route));

export const formatRecommendationDistanceParts = (spot: GeoPoint, currentLocation: GeoPoint, route?: Route) =>
  formatDistanceParts(recommendationDistanceKm(spot, currentLocation, route));
