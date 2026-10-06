import { describe, it, expect } from "vitest";
import { getItemStatus } from "@/lib/traffic-light";

describe("getItemStatus", () => {
  it("returns GREEN when the counted quantity equals the expected quantity", () => {
    expect(getItemStatus(100, 100)).toBe("GREEN");
  });

  it("returns YELLOW when more pieces are counted than expected", () => {
    expect(getItemStatus(102, 100)).toBe("YELLOW");
  });

  it("returns RED when fewer pieces are counted than expected", () => {
    expect(getItemStatus(97, 100)).toBe("RED");
  });

  it("treats a count of zero as RED", () => {
    expect(getItemStatus(0, 50)).toBe("RED");
  });
});