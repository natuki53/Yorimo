import { z } from "zod";

export const reportCreateSchema = z.object({
  targetType: z.enum(["post", "user", "spot"]),
  targetId: z.string().min(1),
  reason: z.enum(["inappropriate", "harassment", "spam", "location_privacy", "other"]),
  detail: z.string().trim().max(2000).nullable().optional()
});

export const blockCreateSchema = z.object({
  blockedUserId: z.string().min(1)
});
