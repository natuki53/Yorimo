import { distanceKm } from "../utils/geo.js";

export type RailRoutePoint = {
  lat: number;
  lng: number;
};

type RailRouteInput = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
};

type BoundingBox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

type OverpassNode = {
  type: "node";
  id: number;
  lat: number;
  lon: number;
};

type OverpassWay = {
  type: "way";
  id: number;
  nodes?: number[];
  tags?: Record<string, string>;
};

type OverpassElement = OverpassNode | OverpassWay;

type OverpassResponse = {
  elements?: OverpassElement[];
};

type RailNode = RailRoutePoint & {
  id: string;
};

type GraphEdge = {
  to: string;
  distance: number;
};

type CacheEntry = {
  expiresAt: number;
  points: RailRoutePoint[];
};

const overpassEndpoints = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];
const routeCache = new Map<string, CacheEntry>();
const inFlightRoutes = new Map<string, Promise<RailRoutePoint[]>>();
const cacheTtlMs = 10 * 60 * 1000;

class MinHeap {
  private readonly items: Array<{ id: string; distance: number }> = [];

  push(item: { id: string; distance: number }) {
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  pop() {
    if (this.items.length === 0) {
      return undefined;
    }

    const root = this.items[0];
    const tail = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = tail;
      this.bubbleDown(0);
    }
    return root;
  }

  get size() {
    return this.items.length;
  }

  private bubbleUp(index: number) {
    let current = index;
    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      if (this.items[parent].distance <= this.items[current].distance) {
        return;
      }
      [this.items[parent], this.items[current]] = [this.items[current], this.items[parent]];
      current = parent;
    }
  }

  private bubbleDown(index: number) {
    let current = index;
    while (true) {
      const left = current * 2 + 1;
      const right = left + 1;
      let smallest = current;

      if (left < this.items.length && this.items[left].distance < this.items[smallest].distance) {
        smallest = left;
      }
      if (right < this.items.length && this.items[right].distance < this.items[smallest].distance) {
        smallest = right;
      }
      if (smallest === current) {
        return;
      }

      [this.items[current], this.items[smallest]] = [this.items[smallest], this.items[current]];
      current = smallest;
    }
  }
}

const isOverpassNode = (element: OverpassElement): element is OverpassNode => element.type === "node";
const isOverpassWay = (element: OverpassElement): element is OverpassWay => element.type === "way";

const buildCacheKey = (input: RailRouteInput) =>
  [
    input.startLat.toFixed(5),
    input.startLng.toFixed(5),
    input.endLat.toFixed(5),
    input.endLng.toFixed(5)
  ].join(":");

const buildBoundingBox = (input: RailRouteInput): BoundingBox => {
  const start = { lat: input.startLat, lng: input.startLng };
  const end = { lat: input.endLat, lng: input.endLng };
  const directDistance = distanceKm(start, end);
  const padding = Math.max(0.015, Math.min(0.12, directDistance / 100));

  return {
    south: Math.min(start.lat, end.lat) - padding,
    west: Math.min(start.lng, end.lng) - padding,
    north: Math.max(start.lat, end.lat) + padding,
    east: Math.max(start.lng, end.lng) + padding
  };
};

const buildOverpassQuery = ({ south, west, north, east }: BoundingBox) =>
  `[out:json][timeout:25];` +
  `(way[railway~"^(rail|subway|light_rail|tram|monorail)$"](${south},${west},${north},${east});>;);` +
  `out body;`;

const fetchRailwayElements = async (bbox: BoundingBox) => {
  const body = new URLSearchParams({ data: buildOverpassQuery(bbox) });

  for (const endpoint of overpassEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "Yorimo local rail route"
        },
        body
      });

      if (!response.ok) {
        continue;
      }

      const payload = (await response.json()) as OverpassResponse;
      return payload.elements ?? [];
    } catch {
      continue;
    }
  }

  return [];
};

const buildRailGraph = (elements: OverpassElement[]) => {
  const nodes = new Map<string, RailNode>();
  const graph = new Map<string, GraphEdge[]>();

  for (const element of elements) {
    if (isOverpassNode(element)) {
      nodes.set(String(element.id), {
        id: String(element.id),
        lat: element.lat,
        lng: element.lon
      });
    }
  }

  const addEdge = (fromId: number, toId: number) => {
    const from = nodes.get(String(fromId));
    const to = nodes.get(String(toId));
    if (!from || !to) {
      return;
    }

    const distance = distanceKm(from, to);
    const fromEdges = graph.get(from.id) ?? [];
    const toEdges = graph.get(to.id) ?? [];
    fromEdges.push({ to: to.id, distance });
    toEdges.push({ to: from.id, distance });
    graph.set(from.id, fromEdges);
    graph.set(to.id, toEdges);
  };

  for (const way of elements.filter(isOverpassWay)) {
    const wayNodes = way.nodes ?? [];
    for (let index = 0; index < wayNodes.length - 1; index += 1) {
      addEdge(wayNodes[index], wayNodes[index + 1]);
    }
  }

  return { graph, nodes };
};

const nearestRailNode = (nodes: Map<string, RailNode>, point: RailRoutePoint) => {
  let nearest: RailNode | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const node of nodes.values()) {
    const distance = distanceKm(point, node);
    if (distance < nearestDistance) {
      nearest = node;
      nearestDistance = distance;
    }
  }

  return nearest;
};

const shortestRailPath = (
  graph: Map<string, GraphEdge[]>,
  nodes: Map<string, RailNode>,
  startId: string,
  endId: string
) => {
  const heap = new MinHeap();
  const distances = new Map<string, number>([[startId, 0]]);
  const previous = new Map<string, string>();
  const visited = new Set<string>();

  heap.push({ id: startId, distance: 0 });

  while (heap.size > 0) {
    const current = heap.pop()!;
    if (visited.has(current.id)) {
      continue;
    }
    visited.add(current.id);

    if (current.id === endId) {
      break;
    }

    for (const edge of graph.get(current.id) ?? []) {
      if (visited.has(edge.to)) {
        continue;
      }

      const nextDistance = current.distance + edge.distance;
      if (nextDistance < (distances.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
        distances.set(edge.to, nextDistance);
        previous.set(edge.to, current.id);
        heap.push({ id: edge.to, distance: nextDistance });
      }
    }
  }

  if (startId !== endId && !previous.has(endId)) {
    return [];
  }

  const path: RailRoutePoint[] = [];
  let cursor: string | undefined = endId;
  while (cursor) {
    const node = nodes.get(cursor);
    if (node) {
      path.push({ lat: node.lat, lng: node.lng });
    }
    if (cursor === startId) {
      break;
    }
    cursor = previous.get(cursor);
  }

  return path.reverse();
};

export const getRailRoutePath = async (input: RailRouteInput) => {
  const cacheKey = buildCacheKey(input);
  const cached = routeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.points;
  }

  const activeRequest = inFlightRoutes.get(cacheKey);
  if (activeRequest) {
    return activeRequest;
  }

  const request = (async () => {
    const elements = await fetchRailwayElements(buildBoundingBox(input));
    const { graph, nodes } = buildRailGraph(elements);
    const start = nearestRailNode(nodes, { lat: input.startLat, lng: input.startLng });
    const end = nearestRailNode(nodes, { lat: input.endLat, lng: input.endLng });

    if (!start || !end) {
      return [];
    }

    const points = shortestRailPath(graph, nodes, start.id, end.id);
    routeCache.set(cacheKey, {
      expiresAt: Date.now() + cacheTtlMs,
      points
    });

    return points;
  })().finally(() => {
    inFlightRoutes.delete(cacheKey);
  });

  inFlightRoutes.set(cacheKey, request);
  return request;
};
