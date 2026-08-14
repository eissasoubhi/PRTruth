import { describe, expect, it, vi } from "vitest";
import { collectPages } from "../src/pagination.js";

describe("collectPages", () => {
  it("collects pages until a short page is returned", async () => {
    const fetchPage = vi.fn(async (page: number, perPage: number) => {
      if (page === 1) return Array.from({ length: perPage }, (_, index) => `a-${index}`);
      return ["b-0", "b-1"];
    });

    const result = await collectPages(fetchPage, 3);

    expect(result).toEqual(["a-0", "a-1", "a-2", "b-0", "b-1"]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 1, 3);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2, 3);
  });

  it("stops after the first short page", async () => {
    const fetchPage = vi.fn(async () => ["only"]);
    const result = await collectPages(fetchPage, 100);

    expect(result).toEqual(["only"]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
