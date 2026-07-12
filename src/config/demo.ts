import { env } from "./env.js";

export const DEMO_USER_ID = "demo-user";
export const DEMO_USER_EMAIL = "demo@yorimo.local";
export const DEMO_DEFAULT_ROUTE_ID = "demo-route-default";

export const DEMO_LIMITS = {
  routes: 20,
  reviews: 100,
  feedbacks: 2000
} as const;

export const isDemoUser = (userId?: string | null) => env.DEMO_MODE && userId === DEMO_USER_ID;

export const isProtectedDemoRoute = (routeId?: string | null) =>
  env.DEMO_MODE && routeId === DEMO_DEFAULT_ROUTE_ID;

export const toPublicRoute = <T extends { id: string }>(route: T) => ({
  ...route,
  isProtected: isProtectedDemoRoute(route.id)
});
