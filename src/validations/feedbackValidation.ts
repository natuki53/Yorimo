import { z } from "zod";

export const feedbackCreateSchema = z.object({
  spotId: z.string().min(1),
  postId: z.string().min(1).nullable().optional(),
  action: z.enum(["view", "save", "skip", "visited", "like", "dislike", "report"])
});

export const savedSpotCreateSchema = z.object({
  spotId: z.string().min(1)
});
