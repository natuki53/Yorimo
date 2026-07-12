import type {
  ApiResponse,
  AuthPayload,
  FeedbackAction,
  Post,
  PostCreatePayload,
  PostsPayload,
  RailRoutePayload,
  ProfileUpdatePayload,
  RecommendationRequest,
  RecommendationsPayload,
  Route,
  RoutePayload,
  SavedSpot,
  StationSearchPayload,
  SpotsPayload,
  User
} from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code = "API_ERROR",
    public readonly status?: number
  ) {
    super(message);
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export const resolveMediaUrl = (url?: string | null) => {
  if (!url) {
    return undefined;
  }

  if (/^https?:\/\//i.test(url) || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  // Prototype assets are served by Vite in development and by Express in production.
  // They must not be prefixed with the development API origin.
  if (url.startsWith("/demo-assets/")) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${API_BASE_URL}${url}`;
  }

  return url;
};

type RequestOptions = {
  token?: string | null;
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const headers = new Headers({
    Accept: "application/json"
  });

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !payload?.success) {
    const message = payload && !payload.success ? payload.error.message : "API request failed";
    const code = payload && !payload.success ? payload.error.code : "HTTP_ERROR";
    throw new ApiError(message, code, response.status);
  }

  return payload.data;
};

export const api = {
  baseUrl: API_BASE_URL,

  demoLogin() {
    return request<AuthPayload>("/api/auth/demo", { method: "POST" });
  },

  login(email: string, password: string) {
    return request<AuthPayload>("/api/auth/login", {
      method: "POST",
      body: { email, password }
    });
  },

  register(body: {
    email: string;
    name: string;
    password: string;
  }) {
    return request<AuthPayload>("/api/auth/register", {
      method: "POST",
      body
    });
  },

  me(token: string) {
    return request<User>("/api/auth/me", { token });
  },

  updateProfile(token: string, body: ProfileUpdatePayload) {
    return request<User>("/api/auth/me", {
      method: "PATCH",
      token,
      body
    });
  },

  routes(token: string) {
    return request<Route[]>("/api/routes", { token });
  },

  createRoute(token: string, body: RoutePayload) {
    return request<Route>("/api/routes", {
      method: "POST",
      token,
      body
    });
  },

  updateRoute(token: string, routeId: string, body: Partial<RoutePayload>) {
    return request<Route>(`/api/routes/${routeId}`, {
      method: "PATCH",
      token,
      body
    });
  },

  deleteRoute(token: string, routeId: string) {
    return request<{ deleted: boolean }>(`/api/routes/${routeId}`, {
      method: "DELETE",
      token
    });
  },

  spots(params: { lat?: number; lng?: number; radiusKm?: number; limit?: number } = {}) {
    const search = new URLSearchParams();
    if (params.lat != null) search.set("lat", String(params.lat));
    if (params.lng != null) search.set("lng", String(params.lng));
    if (params.radiusKm != null) search.set("radiusKm", String(params.radiusKm));
    if (params.limit != null) search.set("limit", String(params.limit));

    const query = search.toString();
    return request<SpotsPayload>(`/api/spots${query ? `?${query}` : ""}`);
  },

  stations(params: { keyword: string; lat?: number; lng?: number; limit?: number }, signal?: AbortSignal) {
    const search = new URLSearchParams({ keyword: params.keyword });
    if (params.lat != null) search.set("lat", String(params.lat));
    if (params.lng != null) search.set("lng", String(params.lng));
    if (params.limit != null) search.set("limit", String(params.limit));

    return request<StationSearchPayload>(`/api/stations?${search.toString()}`, { signal });
  },

  railRoute(params: { startLat: number; startLng: number; endLat: number; endLng: number }, signal?: AbortSignal) {
    const search = new URLSearchParams({
      startLat: String(params.startLat),
      startLng: String(params.startLng),
      endLat: String(params.endLat),
      endLng: String(params.endLng)
    });

    return request<RailRoutePayload>(`/api/rail-routes?${search.toString()}`, { signal });
  },

  recommendations(token: string, body: RecommendationRequest) {
    return request<RecommendationsPayload>("/api/recommendations", {
      method: "POST",
      token,
      body
    });
  },

  feedback(token: string, spotId: string, action: FeedbackAction) {
    return request<unknown>("/api/feedback", {
      method: "POST",
      token,
      body: { spotId, action }
    });
  },

  savedSpots(token: string) {
    return request<SavedSpot[]>("/api/saved-spots", { token });
  },

  saveSpot(token: string, spotId: string) {
    return request<SavedSpot>("/api/saved-spots", {
      method: "POST",
      token,
      body: { spotId }
    });
  },

  deleteSavedSpot(token: string, spotId: string) {
    return request<{ deleted: boolean }>(`/api/saved-spots/${spotId}`, {
      method: "DELETE",
      token
    });
  },

  feed(token: string) {
    return request<Post[]>("/api/feed", { token });
  },

  posts(token: string, params: { userId?: string; spotId?: string; type?: string; limit?: number; offset?: number } = {}) {
    const search = new URLSearchParams();
    if (params.userId) search.set("userId", params.userId);
    if (params.spotId) search.set("spotId", params.spotId);
    if (params.type) search.set("type", params.type);
    if (params.limit != null) search.set("limit", String(params.limit));
    if (params.offset != null) search.set("offset", String(params.offset));

    const query = search.toString();
    return request<PostsPayload>(`/api/posts${query ? `?${query}` : ""}`, { token });
  },

  createPost(token: string, body: PostCreatePayload) {
    return request<Post>("/api/posts", {
      method: "POST",
      token,
      body
    });
  },

  spotPosts(spotId: string) {
    return request<Post[]>(`/api/spots/${spotId}/posts`);
  }
};
