#!/usr/bin/env node

const baseUrl = (process.env.BASE_URL ?? "http://127.0.0.1:8085").replace(/\/$/, "");
const concurrency = Number(process.env.CONCURRENCY ?? 30);
const maxP95Ms = Number(process.env.MAX_P95_MS ?? 8000);

const requestJson = async (path, init = {}) => {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers
    }
  });
  const payload = await response.json().catch(() => null);
  const durationMs = performance.now() - startedAt;
  if (!response.ok || !payload?.success) {
    throw new Error(`${path} failed with ${response.status}: ${JSON.stringify(payload)}`);
  }
  return { data: payload.data, durationMs };
};

const runSession = async () => {
  const auth = await requestJson("/api/auth/demo", { method: "POST" });
  const headers = { Authorization: `Bearer ${auth.data.token}` };
  const routes = await requestJson("/api/routes", { headers });
  const route = routes.data[0];
  if (!route) throw new Error("The demo route is missing");

  const recommendation = await requestJson("/api/recommendations", {
    method: "POST",
    headers,
    body: JSON.stringify({
      currentLat: route.startLat,
      currentLng: route.startLng,
      routeId: route.id,
      availableMinutes: 45,
      budgetMax: 1500,
      mood: "甘いもの",
      interestTags: ["カフェ"]
    })
  });

  if (!Array.isArray(recommendation.data.items) || recommendation.data.items.length === 0) {
    throw new Error("The recommendation response did not contain any items");
  }

  return {
    durationMs: recommendation.durationMs,
    source: recommendation.data.source ?? "unknown"
  };
};

const results = await Promise.all(Array.from({ length: concurrency }, () => runSession()));
const durations = results.map((result) => result.durationMs).sort((a, b) => a - b);
const p95Index = Math.min(durations.length - 1, Math.ceil(durations.length * 0.95) - 1);
const p95Ms = durations[p95Index];
const sources = results.reduce((counts, result) => {
  counts[result.source] = (counts[result.source] ?? 0) + 1;
  return counts;
}, {});

console.log(
  JSON.stringify(
    {
      baseUrl,
      concurrency,
      p95Ms: Math.round(p95Ms),
      sources
    },
    null,
    2
  )
);

if (p95Ms > maxP95Ms) {
  throw new Error(`Recommendation p95 ${Math.round(p95Ms)}ms exceeded ${maxP95Ms}ms`);
}
