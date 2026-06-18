import { z } from "zod";

export const postCreateSchema = z.object({
  spotId: z.string().min(1),
  type: z.enum(["photo", "short_video", "story", "review"]),
  mediaUrl: z.string().url().nullable().optional(),
  caption: z.string().trim().max(2000).nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  moodTags: z.array(z.string().trim().min(1)).default([]),
  crowdLevel: z.string().trim().max(80).nullable().optional(),
  stayMinutes: z.number().int().min(1).max(1440).nullable().optional(),
  budgetUsed: z.number().int().min(0).nullable().optional(),
  visibility: z.enum(["public", "followers", "private"]).default("public"),
  expiresAt: z.coerce.date().nullable().optional()
});

export const postUpdateSchema = postCreateSchema.omit({ spotId: true }).partial();

export const postQuerySchema = z.object({
  spotId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  type: z.enum(["photo", "short_video", "story", "review"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0)
});
