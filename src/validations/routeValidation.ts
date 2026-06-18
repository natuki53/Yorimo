import { z } from "zod";

export const routeCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  startName: z.string().trim().min(1).max(120),
  startLat: z.number().min(-90).max(90),
  startLng: z.number().min(-180).max(180),
  endName: z.string().trim().min(1).max(120),
  endLat: z.number().min(-90).max(90),
  endLng: z.number().min(-180).max(180),
  viaStationNames: z.array(z.string().trim().min(1)).default([]),
  usualDepartureTime: z.string().trim().max(20).nullable().optional(),
  usualArrivalTime: z.string().trim().max(20).nullable().optional()
});

export const routeUpdateSchema = routeCreateSchema.partial();
