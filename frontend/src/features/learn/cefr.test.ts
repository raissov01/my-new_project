import { describe, it, expect } from "vitest";
import { calculateCEFR } from "./cefr";

describe("calculateCEFR", () => {
  it("40% (24/60) → A2", () => expect(calculateCEFR(24, 60)).toBe("A2"));
  it("100% → C2",        () => expect(calculateCEFR(60, 60)).toBe("C2"));
  it("0% → A1",          () => expect(calculateCEFR(0, 60)).toBe("A1"));
  it("50% → B2",         () => expect(calculateCEFR(30, 60)).toBe("B2"));
  it("75% → C1",         () => expect(calculateCEFR(45, 60)).toBe("C1"));
  it("30% → A2",         () => expect(calculateCEFR(18, 60)).toBe("A2"));
  it("total 0 → A1",     () => expect(calculateCEFR(0, 0)).toBe("A1"));
  it("19% → A1",         () => expect(calculateCEFR(11, 60)).toBe("A1"));
  it("84% → C1",         () => expect(calculateCEFR(50, 60)).toBe("C1"));
  it("85% → C2",         () => expect(calculateCEFR(51, 60)).toBe("C2"));
});
