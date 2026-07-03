import type { Express } from "express";
import type { Db } from "mongodb";
import { randomUUID } from "crypto";

import { requireAuth, type AuthedRequest } from "../auth";
import { VALID_GUESSES } from "../words";
import { scoreGuess, randomAnswer } from "../wordle";
import { MAX_GUESSES, emptyStats } from "./shared";

export function registerGameRoutes(app: Express, db: Db) {
  // return the user's most recent unfinished game (for page-refresh resumption)
  app.post("/api/activegame", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const game = await db.collection("Games")
        .find({ userId: req.user!.userId, finished: false })
        .sort({ createdAt: -1 })
        .limit(1)
        .next();
      if (!game || !Array.isArray(game.guesses)) {
        return res.status(200).json({ game: null, error: "" });
      }
      res.status(200).json({
        game: { gameId: game.gameId, guesses: game.guesses, marks: game.marks },
        error: "",
      });
    } catch (e) {
      res.status(200).json({ game: null, error: "" });
    }
  });

  // start a new game -> returns a gameId, answer stays server-side
  app.post("/api/newgame", requireAuth, async (req: AuthedRequest, res) => {
    const answer = randomAnswer();
    const gameId = randomUUID();
    await db.collection("Games").insertOne({
      gameId,
      userId: req.user!.userId,
      answer,
      guesses: [],
      marks: [],
      finished: false,
      createdAt: new Date(),
    });
    res.status(200).json({ gameId });
  });

  // submit a guess -> returns marks + game state
  app.post("/api/guess", requireAuth, async (req: AuthedRequest, res) => {
    const { gameId, guess } = req.body;
    const g = String(guess ?? "").toLowerCase();

    if (g.length !== 5 || !VALID_GUESSES.has(g)) {
      return res.status(200).json({ error: "Not a valid word" });
    }

    const game = await db.collection("Games").findOne({
      gameId,
      userId: req.user!.userId,
    });
    if (!game || game.finished) {
      return res.status(200).json({ error: "No active game" });
    }

    const marks = scoreGuess(g, game.answer);
    const guessNum = game.guesses.length + 1;
    const won = marks.every((m) => m === "correct");
    const lost = !won && guessNum >= MAX_GUESSES;
    const finished = won || lost;

    await db.collection("Games").updateOne({ gameId }, { $set: { finished }, $push: { guesses: g, marks } });

    if (finished) {
      const allGuesses = [...game.guesses, g];
      const allMarks = [...game.marks, marks];
      await updateStats(req.user!.userId, won, guessNum, game.answer, allGuesses, allMarks);
    }

    res.status(200).json({
      marks,
      won,
      lost,
      guessNum,
      // only reveal the answer once the game is over
      answer: finished ? game.answer : undefined,
      error: "",
    });
  });

  app.post("/api/leaderboard", requireAuth, async (req: AuthedRequest, res) => {
    const sort = req.body.sort;

    if (sort === "today") {
      // Midnight EST = 05:00 UTC. Roll back a day if today's 5am UTC hasn't arrived yet.
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setUTCHours(5, 0, 0, 0);
      if (startOfDay > now) startOfDay.setUTCDate(startOfDay.getUTCDate() - 1);

      const top = await db.collection("GameArchive").aggregate([
        { $match: { won: true, playedAt: { $gte: startOfDay } } },
        { $group: { _id: "$userId", wins: { $sum: 1 } } },
        { $sort: { wins: -1, _id: 1 } },
        { $limit: 5 },
        { $lookup: { from: "Users", localField: "_id", foreignField: "UserID", as: "user" } },
      ]).toArray();

      const result = top.map((s) => ({
        name: s.user?.[0]?.Login ?? "Unknown",
        wins: s.wins,
        played: 0,
        maxStreak: 0,
        isMe: s._id === req.user!.userId,
      }));

      return res.status(200).json({ leaderboard: result, error: "" });
    }

    const sortField = sort === "streak" ? "maxStreak" : "wins";
    const top = await db
      .collection("Stats")
      .aggregate([
        { $match: { [sortField]: { $gt: 0 } } },
        { $sort: { [sortField]: -1, userId: 1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "Users",
            localField: "userId",
            foreignField: "UserID",
            as: "user",
          },
        },
      ])
      .toArray();

    const result = top.map((s) => ({
      name: s.user?.[0]?.Login ?? "Unknown",
      wins: s.wins,
      played: s.played,
      maxStreak: s.maxStreak,
      isMe: s.userId === req.user!.userId,
    }));

    res.status(200).json({ leaderboard: result, error: "" });
  });

  // fetch the user's stats
  app.post("/api/stats", requireAuth, async (req: AuthedRequest, res) => {
    const found = await db.collection("Stats").findOne({ userId: req.user!.userId });
    const base = emptyStats(req.user!.userId);
    // merge with defaults so docs missing fields (e.g. created before daily stats were added) are always complete
    const stats = found ? { ...base, ...found } : base;
    res.status(200).json({ stats, error: "" });
  });

  app.post("/api/archive", requireAuth, async (req: AuthedRequest, res) => {
    const games = await db.collection("GameArchive")
      .find({ userId: req.user!.userId })
      .sort({ playedAt: -1 })
      .limit(5)
      .toArray();
    res.status(200).json({ games, error: "" });
  });

  async function updateStats(
    userId: number,
    won: boolean,
    guessNum: number,
    answer: string,
    guesses: string[],
    marks: string[][]
  ) {
    const stats =
      (await db.collection("Stats").findOne({ userId })) ?? emptyStats(userId);

    stats.played += 1;
    if (won) {
      stats.wins += 1;
      stats.currentStreak += 1;
      stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
      stats.distribution[guessNum - 1] += 1;
    } else {
      stats.currentStreak = 0;
    }
    const playedAt = new Date();
    await Promise.all([
      db.collection("Stats").updateOne({ userId }, { $set: stats }, { upsert: true }),
      db.collection("GameArchive").insertOne({ userId, answer, guesses, marks, won, guessNum, playedAt }),
    ]);
  }
}

