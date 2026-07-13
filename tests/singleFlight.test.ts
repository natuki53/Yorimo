import { describe, expect, it, vi } from "vitest";
import { createSingleFlight } from "../src/utils/singleFlight.js";

describe("createSingleFlight", () => {
  it("coalesces concurrent work for the same key and releases it after completion", async () => {
    let resolveOperation!: (value: string) => void;
    const operation = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveOperation = resolve;
        })
    );
    const run = createSingleFlight<string, string>();

    const requests = Array.from({ length: 30 }, () => run("shared-route", operation));
    expect(operation).toHaveBeenCalledTimes(1);

    resolveOperation("ready");
    await expect(Promise.all(requests)).resolves.toEqual(Array(30).fill("ready"));

    const secondOperation = vi.fn(async () => "refreshed");
    await expect(run("shared-route", secondOperation)).resolves.toBe("refreshed");
    expect(operation).toHaveBeenCalledTimes(1);
    expect(secondOperation).toHaveBeenCalledTimes(1);
  });
});
