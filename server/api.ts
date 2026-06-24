import type { Express } from "express";
import type { MongoClient } from "mongodb";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";

import { createToken } from "./createJWT";
import { requireAuth, type AuthedRequest } from "./auth";
import { ANSWERS, VALID_GUESSES } from "./words";
import { scoreGuess } from "./wordle";

const SALT_ROUNDS = 10;
const MAX_GUESSES = 6;

export function setApp(app: Express, client: MongoClient) {
  const db = client.db();

  app.post("/api/register", async (req, res) => {
    const { login, password, email } = req.body;
    if (!login || !password || !email) {
      return res.status(200).json({ error: "Username, email, and password required" });
    }

    // basic email shape check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(200).json({ error: "Invalid email address" });
    }

    const existing = await db.collection("Users").findOne({ Login: login });
    if (existing) {
      return res.status(200).json({ error: "User already exists" });
    }

    const last = await db.collection("Users").find().sort({ UserID: -1 }).limit(1).toArray();
    const nextId = last.length ? last[0].UserID + 1 : 1;

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const user = {
      UserID: nextId,
      Login: login,
      Email: email,
      Password: hashed,
      EmailVerified: false,  // groundwork for later verification
    };
    await db.collection("Users").insertOne(user);

    const token = createToken(user.Login, user.UserID);
    res.status(200).json({
      id: user.UserID,
      login: user.Login,
      ...token,
    });
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 10,                   // 10 attempts per window per IP
    message: { error: "Too many attempts, try again later" },
  });

  app.post("/api/login", loginLimiter, async (req, res) => {
    const { login, password } = req.body;

    const user = await db.collection("Users").findOne({ Login: login });
    if (!user) {
      return res.status(200).json({ error: "Login/Password incorrect" });
    }

    const match = await bcrypt.compare(password, user.Password);
    if (!match) {
      return res.status(200).json({ error: "Login/Password incorrect" });
    }

    const token = createToken(user.FirstName, user.LastName, user.UserID);
    res.status(200).json({
      id: user.UserID,
      firstName: user.FirstName,
      lastName: user.LastName,
      ...token,
    });
  });

  // start a new game -> returns a gameId, answer stays server-side
  app.post("/api/newgame", requireAuth, async (req: AuthedRequest, res) => {
    const answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
    const gameId = randomUUID();
    await db.collection("Games").insertOne({
      gameId,
      userId: req.user!.userId,
      answer,
      guesses: 0,
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
    const guessNum = game.guesses + 1;
    const won = marks.every((m) => m === "correct");
    const lost = !won && guessNum >= MAX_GUESSES;
    const finished = won || lost;

    await db.collection("Games").updateOne(
      { gameId },
      { $set: { guesses: guessNum, finished } }
    );

    if (finished) {
      await updateStats(req.user!.userId, won, guessNum);
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
    const top = await db
      .collection("Stats")
      .find({ wins: { $gt: 0 } })
      .sort({ wins: -1 })
      .limit(10)
      .toArray();

    // attach display names from Users
    const result = await Promise.all(
      top.map(async (s) => {
        const user = await db.collection("Users").findOne({ UserID: s.userId });
        return {
          name: user ? user.Login : "Unknown",
          wins: s.wins,
          played: s.played,
          maxStreak: s.maxStreak,
          isMe: s.userId === req.user!.userId,
        };
      })
    );

    res.status(200).json({ leaderboard: result, error: "" });
  });

  // fetch the user's stats
  app.post("/api/stats", requireAuth, async (req: AuthedRequest, res) => {
    const stats = await db
      .collection("Stats")
      .findOne({ userId: req.user!.userId });
    res.status(200).json({ stats: stats ?? emptyStats(req.user!.userId), error: "" });
  });

  app.post("/api/theme/get", requireAuth, async (req: AuthedRequest, res) => {
    const doc = await db
      .collection("Themes")
      .findOne({ userId: req.user!.userId });
    res.status(200).json({ css: doc?.css ?? "", error: "" });
  });

  app.post("/api/theme/save", requireAuth, async (req: AuthedRequest, res) => {
    const { css } = req.body;
    if (typeof css !== "string" || css.length > 10000) {
      return res.status(200).json({ error: "Invalid theme" });
    }
    await db.collection("Themes").updateOne(
      { userId: req.user!.userId },
      { $set: { userId: req.user!.userId, css, updatedAt: new Date() } },
      { upsert: true }
    );
    res.status(200).json({ error: "" });
  });

  async function updateStats(userId: number, won: boolean, guessNum: number) {
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
    await db.collection("Stats").updateOne(
      { userId },
      { $set: stats },
      { upsert: true }
    );
  }
}

function emptyStats(userId: number) {
  return {
    userId,
    played: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    distribution: [0, 0, 0, 0, 0, 0], // index = guesses-1
  };
}
