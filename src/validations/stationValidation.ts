import { z } from "zod";

export const stationQuerySchema = z.object({
  keyword: z.string().trim().min(1).max(120),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(8)
});
