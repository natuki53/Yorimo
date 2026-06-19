import { z } from "zod";
import { optionalNullableNonNegativeInt, tagsSchema } from "./common.js";

const spotBaseSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).nullable().optional(),
  category: z.string().trim().min(1).max(80),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().trim().max(240).nullable().optional(),
  stationName: z.string().trim().max(120).nullable().optional(),
  priceMin: z.number().int().min(0).nullable().optional(),
  priceMax: z.number().int().min(0).nullable().optional(),
  openingHours: z.string().trim().max(240).nullable().optional(),
  tags: tagsSchema.optional(),
  imageUrl: z.string().url().nullable().optional(),
  averageStayMinutes: z.number().int().min(1).max(1440).nullable().optional()
});

export const spotCreateSchema = spotBaseSchema
  .refine((value) => value.priceMin == null || value.priceMax == null || value.priceMin <= value.priceMax, {
    message: "priceMin must be less than or equal to priceMax",
    path: ["priceMax"]
  });

export const spotUpdateSchema = spotBaseSchema
  .partial()
  .refine((value) => value.priceMin == null || value.priceMax == null || value.priceMin <= value.priceMax, {
    message: "priceMin must be less than or equal to priceMax",
    path: ["priceMax"]
  });

export const spotQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
  minBudget: optionalNullableNonNegativeInt,
  maxBudget: optionalNullableNonNegativeInt,
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().positive().max(100).optional(),
  keyword: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0)
});
