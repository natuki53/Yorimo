import { describe, expect, it } from "vitest";
import { updateProfileSchema } from "../src/validations/authValidation.js";
import { recommendationRequestSchema } from "../src/validations/recommendationValidation.js";

const baseRecommendationRequest = {
  currentLat: 35.681236,
  currentLng: 139.767125,
  availableMinutes: 45
};

describe("recommendation validation", () => {
  it("normalizes a single slider budget into budgetMax", () => {
    const parsed = recommendationRequestSchema.parse({
      ...baseRecommendationRequest,
      budget: "1800"
    });

    expect(parsed.budgetMax).toBe(1800);
  });

  it("keeps explicit budgetMax ahead of the single slider budget", () => {
    const parsed = recommendationRequestSchema.parse({
      ...baseRecommendationRequest,
      budget: "1800",
      budgetMax: "1200"
    });

    expect(parsed.budgetMax).toBe(1200);
  });

  it("rejects a budget minimum greater than the resolved maximum", () => {
    expect(() =>
      recommendationRequestSchema.parse({
        ...baseRecommendationRequest,
        budgetMin: "2000",
        budget: "1500"
      })
    ).toThrow();
  });
});

describe("profile validation", () => {
  it("normalizes a single slider default budget into defaultBudgetMax", () => {
    const parsed = updateProfileSchema.parse({
      defaultBudget: "1800"
    });

    expect(parsed.defaultBudgetMax).toBe(1800);
  });

  it("keeps explicit defaultBudgetMax ahead of the single slider default budget", () => {
    const parsed = updateProfileSchema.parse({
      defaultBudget: "1800",
      defaultBudgetMax: "1200"
    });

    expect(parsed.defaultBudgetMax).toBe(1200);
  });
});
