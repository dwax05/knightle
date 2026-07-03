import type { Express } from "express";
import type { Db } from "mongodb";
import { requireAuth, type AuthedRequest } from "../auth";
import { ANSWERS, VALID_GUESSES } from "../words";
import { scoreGuess } from "../wordle";
import { MAX_GUESSES, emptyStats } from "./shared";

const DAILY_EPOCH = "2026-07-02";

export function getEstDateString(): string {
  // EST = UTC-5; fixed offset, consistent with leaderboard "today" boundary (05:00 UTC)
  const est = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return est.toISOString().slice(0, 10);
}

const DAY_MS = 1000 * 60 * 60 * 24;
const EPOCH_MS = new Date(DAILY_EPOCH + "T00:00:00Z").getTime();

function getDayIndex(dateStr: string): number {
  return Math.floor((new Date(dateStr + "T00:00:00Z").getTime() - EPOCH_MS) / DAY_MS);
}

export function getDayNumber(dateStr: string): number {
  return getDayIndex(dateStr) + 1;
}

// mulberry32 PRNG — deterministic per day index
export function getDailyWord(dateStr: string): string {
  const dayIndex = getDayIndex(dateStr);
  let a = (dayIndex + 1337) | 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
  const rand = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return ANSWERS[Math.floor(rand * ANSWERS.length)];
}

export function registerDailyRoutes(app: Express, db: Db) {
  // public — returns today's date + day number so guests can key their localStorage state
  app.post("/api/daily/info", async (_req, res) => {
    const date = getEstDateString();
    res.status(200).json({ dayNumber: getDayNumber(date), date, error: "" });
  });

  // public — scores a single guest guess; client tracks state in localStorage
  app.post("/api/daily/guest/guess", async (req, res) => {
    const { guess, guessNum } = req.body;
    const g = String(guess ?? "").toLowerCase();
    const n = Number(guessNum);

    if (g.length !== 5 || !VALID_GUESSES.has(g)) {
      return res.status(200).json({ error: "Not a valid word" });
    }
    if (!Number.isInteger(n) || n < 1 || n > MAX_GUESSES) {
      return res.status(200).json({ error: "Invalid guess number" });
    }

    const date = getEstDateString();
    const word = getDailyWord(date);
    const marks = scoreGuess(g, word);
    const won = marks.every((m) => m === "correct");
    const lost = !won && n >= MAX_GUESSES;

    res.status(200).json({
      marks,
      won,
      lost,
      guessNum: n,
      answer: (won || lost) ? word : undefined,
      error: "",
    });
  });

  // get or create today's daily game state
  app.post("/api/daily/state", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const date = getEstDateString();
      const dayNumber = getDayNumber(date);

      const game = await db.collection("DailyGames").findOneAndUpdate(
        { userId: req.user!.userId, date },
        { $setOnInsert: { userId: req.user!.userId, date, word: getDailyWord(date), guesses: [], marks: [], done: false, won: false } },
        { upsert: true, returnDocument: "after" }
      );

      res.status(200).json({
        dayNumber,
        date,
        guesses: game!.guesses,
        marks: game!.marks,
        done: game!.done,
        won: game!.won,
        answer: game!.done ? game!.word : undefined,
        error: "",
      });
    } catch {
      res.status(200).json({ error: "Failed to load daily game" });
    }
  });

  // submit a guess to today's daily
  app.post("/api/daily/guess", requireAuth, async (req: AuthedRequest, res) => {
    const { guess } = req.body;
    const g = String(guess ?? "").toLowerCase();

    if (g.length !== 5 || !VALID_GUESSES.has(g)) {
      return res.status(200).json({ error: "Not a valid word" });
    }

    const date = getEstDateString();
    const game = await db.collection("DailyGames").findOne({
      userId: req.user!.userId,
      date,
    });

    if (!game || game.done) {
      return res.status(200).json({ error: "No active daily game" });
    }

    const marks = scoreGuess(g, game.word as string);
    const guessNum = (game.guesses as string[]).length + 1;
    const won = marks.every((m) => m === "correct");
    const lost = !won && guessNum >= MAX_GUESSES;
    const done = won || lost;

    await db.collection("DailyGames").updateOne(
      { userId: req.user!.userId, date },
      { $set: { done, won }, $push: { guesses: g, marks } }
    );

    if (done) {
      await updateDailyStats(req.user!.userId, won, guessNum, date);
    }

    res.status(200).json({
      marks,
      won,
      lost,
      guessNum,
      answer: done ? game.word : undefined,
      error: "",
    });
  });

  async function updateDailyStats(userId: number, won: boolean, guessNum: number, date: string) {
    const stats = await db.collection("Stats").findOne({ userId });

    const yesterday = new Date(date + "T00:00:00Z");
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const prevStreak: number = (stats?.dailyCurrentStreak as number) ?? 0;
    const lastDate: string = (stats?.lastDailyDate as string) ?? "";
    const newStreak = won ? (lastDate === yesterdayStr ? prevStreak + 1 : 1) : 0;

    const dist: number[] = (stats?.dailyGuessDistribution as number[]) ?? [0, 0, 0, 0, 0, 0];
    if (won) dist[guessNum - 1] = (dist[guessNum - 1] ?? 0) + 1;

    await db.collection("Stats").updateOne(
      { userId },
      {
        $inc: {
          dailyPlayed: 1,
          dailyWins: won ? 1 : 0,
        },
        $max: { dailyMaxStreak: newStreak },
        $set: {
          dailyCurrentStreak: newStreak,
          lastDailyDate: date,
          dailyGuessDistribution: dist,
        },
        $setOnInsert: emptyStats(userId),
      },
      { upsert: true }
    );
  }
}

