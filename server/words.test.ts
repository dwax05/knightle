import { describe, it, expect } from "vitest";
import { ANSWERS, VALID_GUESSES } from "./words";

describe("ANSWERS", () => {
  it("contains at least 1000 words", () => {
    expect(ANSWERS.length).toBeGreaterThanOrEqual(1000);
  });

  it("every entry is exactly 5 characters", () => {
    const bad = ANSWERS.filter(w => w.length !== 5);
    expect(bad).toEqual([]);
  });

  it("every entry is lowercase", () => {
    const bad = ANSWERS.filter(w => w !== w.toLowerCase());
    expect(bad).toEqual([]);
  });

  it("every entry is alphabetic", () => {
    const bad = ANSWERS.filter(w => !/^[a-z]+$/.test(w));
    expect(bad).toEqual([]);
  });

  it("has no duplicates", () => {
    expect(new Set(ANSWERS).size).toBe(ANSWERS.length);
  });
});

describe("VALID_GUESSES", () => {
  it("contains at least 5000 words", () => {
    expect(VALID_GUESSES.size).toBeGreaterThanOrEqual(5000);
  });

  it("every entry is exactly 5 characters", () => {
    const bad = [...VALID_GUESSES].filter(w => w.length !== 5);
    expect(bad).toEqual([]);
  });

  it("every entry is lowercase", () => {
    const bad = [...VALID_GUESSES].filter(w => w !== w.toLowerCase());
    expect(bad).toEqual([]);
  });

  it("contains every answer", () => {
    const missing = ANSWERS.filter(w => !VALID_GUESSES.has(w));
    expect(missing).toEqual([]);
  });
});
