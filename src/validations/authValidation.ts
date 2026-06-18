import { z } from "zod";
import { optionalNullableString, tagsSchema } from "./common.js";

const budgetFields = {
  defaultBudgetMin: z.number().int().min(0).nullable().optional(),
  defaultBudgetMax: z.number().int().min(0).nullable().optional()
};

export const registerSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    email: z.string().email().toLowerCase(),
    password: z.string().min(8).max(128),
    ageRange: optionalNullableString,
    homeStation: optionalNullableString,
    schoolOrWorkStation: optionalNullableString,
    interests: tagsSchema.optional(),
    ...budgetFields
  })
  .refine(
    (value) =>
      value.defaultBudgetMin == null ||
      value.defaultBudgetMax == null ||
      value.defaultBudgetMin <= value.defaultBudgetMax,
    {
      message: "defaultBudgetMin must be less than or equal to defaultBudgetMax",
      path: ["defaultBudgetMax"]
    }
  );

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1)
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    ageRange: optionalNullableString,
    homeStation: optionalNullableString,
    schoolOrWorkStation: optionalNullableString,
    interests: tagsSchema.optional(),
    ...budgetFields
  })
  .refine(
    (value) =>
      value.defaultBudgetMin == null ||
      value.defaultBudgetMax == null ||
      value.defaultBudgetMin <= value.defaultBudgetMax,
    {
      message: "defaultBudgetMin must be less than or equal to defaultBudgetMax",
      path: ["defaultBudgetMax"]
    }
  );
