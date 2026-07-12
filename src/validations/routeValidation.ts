import { z } from "zod";

export const routeEndpointTypeSchema = z.enum(["station", "pin"]);
export const routeTravelModeSchema = z.enum(["transit", "driving", "walking", "bicycling"]);

export const routeCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  startType: routeEndpointTypeSchema.default("station"),
  startName: z.string().trim().min(1).max(120),
  startLat: z.number().min(-90).max(90),
  startLng: z.number().min(-180).max(180),
  endType: routeEndpointTypeSchema.default("station"),
  endName: z.string().trim().min(1).max(120),
  endLat: z.number().min(-90).max(90),
  endLng: z.number().min(-180).max(180),
  travelMode: routeTravelModeSchema.default("transit"),
  viaStationNames: z.array(z.string().trim().min(1)).default([]),
  usualDepartureTime: z.string().trim().max(20).nullable().optional(),
  usualArrivalTime: z.string().trim().max(20).nullable().optional()
});

export const routeUpdateSchema = routeCreateSchema.partial();
