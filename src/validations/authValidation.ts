import { z } from "zod";
import { optionalNullableNonNegativeInt, optionalNullableString, tagsSchema } from "./common.js";

const budgetFields = {
  defaultBudget: optionalNullableNonNegativeInt,
  defaultBudgetMin: optionalNullableNonNegativeInt,
  defaultBudgetMax: optionalNullableNonNegativeInt
};

const normalizeDefaultBudget = <T extends { defaultBudget?: number | null; defaultBudgetMax?: number | null }>(
  value: T
) => ({
  ...value,
  defaultBudgetMax: value.defaultBudgetMax ?? value.defaultBudget
});

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
  .transform(normalizeDefaultBudget)
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
  .transform(normalizeDefaultBudget)
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
