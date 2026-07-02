import { ANSWERS } from "./words";

export type Mark = "correct" | "present" | "absent";

export function randomAnswer(): string {
  return ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
}

export function scoreGuess(guess: string, answer: string): Mark[] {
  const result: Mark[] = Array(5).fill("absent");
  const counts: Record<string, number> = {};

  for (const ch of answer) counts[ch] = (counts[ch] ?? 0) + 1;

  // pass 1: greens
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) {
      result[i] = "correct";
      counts[guess[i]]--;
    }
  }
  // pass 2: yellows
  for (let i = 0; i < 5; i++) {
    if (result[i] === "correct") continue;
    if (counts[guess[i]] > 0) {
      result[i] = "present";
      counts[guess[i]]--;
    }
  }
  return result;
}
