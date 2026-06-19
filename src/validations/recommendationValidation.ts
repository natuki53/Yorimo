import { z } from "zod";
import { optionalNullableNonNegativeInt } from "./common.js";

export const recommendationRequestSchema = z
  .object({
    currentLat: z.number().min(-90).max(90),
    currentLng: z.number().min(-180).max(180),
    routeId: z.string().min(1).nullable().optional(),
    availableMinutes: z.number().int().min(1).max(1440),
    budget: optionalNullableNonNegativeInt,
    budgetMin: optionalNullableNonNegativeInt,
    budgetMax: optionalNullableNonNegativeInt,
    mood: z.string().trim().max(240).nullable().optional(),
    interestTags: z.array(z.string().trim().min(1)).default([])
  })
  .transform((value) => ({
    ...value,
    budgetMax: value.budgetMax ?? value.budget
  }))
  .refine((value) => value.budgetMin == null || value.budgetMax == null || value.budgetMin <= value.budgetMax, {
    message: "budgetMin must be less than or equal to budgetMax",
    path: ["budgetMax"]
  });
