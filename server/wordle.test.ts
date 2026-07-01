import { describe, it, expect } from "vitest";
import { scoreGuess } from "./wordle";

describe("scoreGuess", () => {
  it("marks all correct on exact match", () => {
    expect(scoreGuess("crane", "crane")).toEqual([
      "correct", "correct", "correct", "correct", "correct",
    ]);
  });

  it("marks all absent when no letters match", () => {
    expect(scoreGuess("mists", "crane")).toEqual([
      "absent", "absent", "absent", "absent", "absent",
    ]);
  });

  it("marks present when letter is in answer but wrong position", () => {
    // acorn vs crane: no exact matches; a,c,r,n are all in "crane" but wrong positions
    expect(scoreGuess("acorn", "crane")).toEqual([
      "present", "present", "absent", "present", "present",
    ]);
  });

  it("does not double-count a letter that appears once in the answer", () => {
    // answer has one 'r'; guess has two 'r's — only one should be marked non-absent
    const result = scoreGuess("rarer", "crane");
    const rPositions = [0, 2, 4]; // indices of 'r' in 'rarer'
    const rMarked = rPositions.filter(i => result[i] !== "absent");
    expect(rMarked.length).toBe(1);
  });

  it("correct takes priority over present for the same letter", () => {
    // eerie vs crane: 'e' at index 4 is an exact match (crane[4]='e'), consuming the
    // only 'e' in the count — the two earlier 'e's in the guess are then absent
    const result = scoreGuess("eerie", "crane");
    expect(result[4]).toBe("correct"); // e matched in place
    expect(result[0]).toBe("absent");  // extra e, count exhausted by correct pass
    expect(result[1]).toBe("absent");  // extra e, count exhausted by correct pass
  });

  it("handles answer with duplicate letters correctly", () => {
    // answer 'spell' has two l's; guess 'llano' has two l's at 0 and 1 — both should
    // be present since there are two l's available in the answer
    const result = scoreGuess("llano", "spell");
    expect(result[0]).toBe("present");
    expect(result[1]).toBe("present");
  });

  it("returns an array of length 5", () => {
    expect(scoreGuess("audio", "crane")).toHaveLength(5);
  });
});
