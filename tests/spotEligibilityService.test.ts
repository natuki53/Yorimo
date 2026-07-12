import { describe, expect, it } from "vitest";
import { isRecommendablePlaceCandidate, isRecommendableSpot } from "../src/services/spotEligibilityService.js";

describe("spot eligibility", () => {
  it("rejects medical facilities by text and Google Places type", () => {
    expect(isRecommendableSpot({ category: "病院", name: "中央総合病院", tags: ["医療"] })).toBe(false);
    expect(isRecommendableSpot({ category: "サービス", name: "駅前クリニック", tags: [] })).toBe(false);
    expect(isRecommendablePlaceCandidate({ name: "Neighborhood Clinic", types: ["doctor"] })).toBe(false);
  });

  it("rejects supermarkets and grocery stores", () => {
    expect(isRecommendableSpot({ category: "スーパー", name: "駅前スーパー", tags: ["買い物"] })).toBe(false);
    expect(isRecommendableSpot({ category: "買い物", name: "Local Supermarket", tags: [] })).toBe(false);
    expect(isRecommendablePlaceCandidate({ name: "Grocery Market", types: ["grocery_store"] })).toBe(false);
  });

  it("rejects car-related utility stops such as gas stations", () => {
    expect(isRecommendableSpot({ category: "サービス", name: "駅前ガソリンスタンド", tags: [] })).toBe(false);
    expect(isRecommendableSpot({ category: "自動車", name: "中央レンタカー", tags: [] })).toBe(false);
    expect(isRecommendablePlaceCandidate({ name: "Fuel Stop", types: ["gas_station"] })).toBe(false);
    expect(isRecommendablePlaceCandidate({ name: "Car Repair Shop", types: ["car_repair"] })).toBe(false);
  });

  it("rejects practical errands and infrastructure that do not fit yorimichi recommendations", () => {
    expect(isRecommendableSpot({ category: "金融", name: "駅前ATM", tags: [] })).toBe(false);
    expect(isRecommendableSpot({ category: "不動産", name: "中央不動産", tags: [] })).toBe(false);
    expect(isRecommendablePlaceCandidate({ name: "Business Hotel", types: ["lodging"] })).toBe(false);
    expect(isRecommendablePlaceCandidate({ name: "Funeral Hall", types: ["funeral_home"] })).toBe(false);
  });

  it("allows typical yorimichi spots", () => {
    expect(isRecommendableSpot({ category: "カフェ", name: "こもれびカフェ", tags: ["静かな場所"] })).toBe(true);
    expect(isRecommendablePlaceCandidate({ category: "書店", name: "青空ブックス", types: ["book_store"] })).toBe(true);
    expect(isRecommendablePlaceCandidate({ category: "観光", name: "小さな神社", types: ["tourist_attraction"] })).toBe(true);
  });
});
