import { z } from "zod";

export const idParamSchema = z.object({
  id: z.string().min(1)
});

export const spotIdParamSchema = z.object({
  spotId: z.string().min(1)
});

export const blockedUserIdParamSchema = z.object({
  blockedUserId: z.string().min(1)
});

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0)
});

export const optionalNullableString = z.string().trim().min(1).nullable().optional();

export const tagsSchema = z.array(z.string().trim().min(1)).default([]);
