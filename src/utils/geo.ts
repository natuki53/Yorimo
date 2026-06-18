const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const distanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
};

export const distancePointToSegmentKm = (
  point: { lat: number; lng: number },
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
) => {
  const x = point.lng;
  const y = point.lat;
  const x1 = start.lng;
  const y1 = start.lat;
  const x2 = end.lng;
  const y2 = end.lat;

  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return distanceKm(point, start);
  }

  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  const projected = {
    lat: y1 + t * dy,
    lng: x1 + t * dx
  };

  return distanceKm(point, projected);
};
