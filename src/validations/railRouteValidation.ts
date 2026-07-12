import { z } from "zod";

export const railRouteQuerySchema = z.object({
  startLat: z.coerce.number().min(-90).max(90),
  startLng: z.coerce.number().min(-180).max(180),
  endLat: z.coerce.number().min(-90).max(90),
  endLng: z.coerce.number().min(-180).max(180)
});
