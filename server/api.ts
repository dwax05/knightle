import type { Express } from "express";
import type { MongoClient, Db } from "mongodb";
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

    const token = createToken(user.Login, user.UserID);
    res.status(200).json({
      id: user.UserID,
      login: user.Login,
      ...token,
    });
  });

  // return the user's most recent unfinished game (for page-refresh resumption)
  app.post("/api/activegame", requireAuth, async (req: AuthedRequest, res) => {
    const game = await db.collection("Games").findOne(
      { userId: req.user!.userId, finished: false, guesses: { $type: "array" } },
      { sort: { createdAt: -1 } }
    );
    if (!game) return res.status(200).json({ game: null, error: "" });
    res.status(200).json({
      game: { gameId: game.gameId, guesses: game.guesses, marks: game.marks },
      error: "",
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
    const guessNum = (Array.isArray(game.guesses) ? game.guesses.length : game.guesses) + 1;
    const won = marks.every((m) => m === "correct");
    const lost = !won && guessNum >= MAX_GUESSES;
    const finished = won || lost;

    await db.collection("Games").updateOne(
      { gameId },
      {
        $push: { guesses: g, marks: marks } as any,
        $set: { finished },
      }
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
      .aggregate([
        { $match: { wins: { $gt: 0 } } },
        { $sort: { wins: -1 } },
        { $limit: 10 },
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

  // player 1 starts a room
  app.post("/api/versus/create", requireAuth, async (req: AuthedRequest, res) => {
    const code = await makeRoomCode(db);
    const answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
    const uid = String(req.user!.userId);

    await db.collection("Versus").insertOne({
      code,
      answer,
      players: {
        [uid]: { login: req.user!.login, guesses: [], finished: false, won: false },
      },
      winner: null,
      status: "waiting",
      createdAt: new Date(),
    });

    res.status(200).json({ code, error: "" });
  });

  // player 2 enters the code
  app.post("/api/versus/join", requireAuth, async (req: AuthedRequest, res) => {
    const code = String(req.body.code ?? "").toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) return res.status(200).json({ error: "Invalid code" });

    const uid = String(req.user!.userId);
    const game = await db.collection("Versus").findOne({ code: code });

    if (!game) return res.status(200).json({ error: "Room not found" });
    if (game.status !== "waiting" && !game.players[uid])
      return res.status(200).json({ error: "Room is full or already started" });
    if (game.players[uid])
      return res.status(200).json({ error: "", code: game.code }); // rejoining own room

    await db.collection("Versus").updateOne(
      { code: game.code },
      {
        $set: {
          [`players.${uid}`]: { login: req.user!.login, guesses: [], finished: false, won: false },
          status: "active",
        },
      }
    );

    res.status(200).json({ code: game.code, error: "" });
  });

  // GUESS — score against the shared answer, record in this player's slot
  app.post("/api/versus/guess", requireAuth, async (req: AuthedRequest, res) => {
    const code = String(req.body.code ?? "").toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) return res.status(200).json({ error: "Invalid code" });

    const guess = req.body.guess;
    const uid = String(req.user!.userId);
    const g = String(guess ?? "").toLowerCase();

    if (g.length !== 5 || !VALID_GUESSES.has(g))
      return res.status(200).json({ error: "Not a valid word" });

    const game = await db.collection("Versus").findOne({ code });
    if (!game || !game.players[uid]) return res.status(200).json({ error: "No active game" });
    if (game.players[uid].finished) return res.status(200).json({ error: "You're already done" });
    if (game.status === "done") return res.status(200).json({ error: "Game is over" });

    const marks = scoreGuess(g, game.answer);
    const won = marks.every((m) => m === "correct");
    const player = game.players[uid];
    const newGuessCount = player.guesses.length + 1;
    const finished = won || newGuessCount >= MAX_GUESSES;

    const update: any = {
      $push: { [`players.${uid}.guesses`]: g },
      $set: {
        [`players.${uid}.finished`]: finished,
        [`players.${uid}.won`]: won,
      },
    };

    if (won) {
      await db.collection("Versus").updateOne(
        { code: game.code, winner: null },
        { $set: { winner: req.user!.userId, status: "done" } }
      );
    }

    await db.collection("Versus").updateOne({ code: game.code }, update); // ← no $set wrapper

    // return this player's marks + opponent's public state
    const updated = await db.collection("Versus").findOne({ code: game.code });
    res.status(200).json({
      marks,
      won,
      finished,
      guessNum: newGuessCount,
      round: updated!.round ?? 0,        // ← add
      answer: finished ? game.answer : undefined,
      opponent: opponentPublicState(updated, uid),
      winner: updated!.winner,
      status: updated!.status,
      error: "",
    });
  });

  // STATE — for polling the opponent's progress
  app.post("/api/versus/state", requireAuth, async (req: AuthedRequest, res) => {
    const { code } = req.body;
    const uid = String(req.user!.userId);
    const game = await db.collection("Versus").findOne({ code: code?.toUpperCase() });
    if (!game || !game.players[uid]) return res.status(200).json({ error: "No active game" });

    res.status(200).json({
      status: game.status,
      winner: game.winner,
      round: game.round ?? 0,
      answer: game.status === "done" ? game.answer : undefined,
      opponent: opponentPublicState(game, uid),
      rematch: {
        me: !!game.rematch?.[uid],
        opponent: opponentRematchRequested(game, uid),
      },
      error: "",
    });
  });

  app.post("/api/versus/rematch", requireAuth, async (req: AuthedRequest, res) => {
    const code = String(req.body.code ?? "").toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) return res.status(200).json({ error: "Invalid code" });

    const uid = String(req.user!.userId);
    const game = await db.collection("Versus").findOne({ code });
    if (!game || !game.players[uid]) return res.status(200).json({ error: "Not in this room" });
    if (game.status !== "done") return res.status(200).json({ error: "Match isn't over" });

    // record this player's rematch request
    await db.collection("Versus").updateOne(
      { code },
      { $set: { [`rematch.${uid}`]: true } }
    );

    // re-read and check if BOTH players have now requested
    const updated = await db.collection("Versus").findOne({ code });
    const playerIds = Object.keys(updated!.players);
    const allReady = playerIds.every((id) => updated!.rematch?.[id]);

    if (allReady) {
      const newAnswer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
      const resetPlayers: any = {};
      for (const [id, p] of Object.entries(updated!.players)) {
        resetPlayers[id] = { login: (p as any).login, guesses: [], finished: false, won: false };
      }
      await db.collection("Versus").updateOne(
        { code },
        {
          $set: {
            answer: newAnswer,
            players: resetPlayers,
            winner: null,
            status: "active",
            createdAt: new Date(),
          },
          $unset: { rematch: "" },     // clear the requests for the new round
          $inc: { round: 1 },
        }
      );
    }

    res.status(200).json({ error: "" });
  });

  app.post("/api/password-reset", requireAuth, async (req: AuthedRequest, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(200).json({ error: "Current and new password required" });
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(200).json({ error: "New password must be at least 6 characters" });
    }

    const user = await db.collection("Users").findOne({ UserID: req.user!.userId });
    if (!user) return res.status(200).json({ error: "User not found" });

    const match = await bcrypt.compare(currentPassword, user.Password);
    if (!match) return res.status(200).json({ error: "Current password is incorrect" });

    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.collection("Users").updateOne(
      { UserID: req.user!.userId },
      { $set: { Password: hashed } }
    );
    res.status(200).json({ error: "" });
  });

  app.post("/api/clear-game-data", requireAuth, async (req: AuthedRequest, res) => {
    await Promise.all([
      db.collection("Stats").deleteOne({ userId: req.user!.userId }),
      db.collection("Games").deleteMany({ userId: req.user!.userId }),
    ]);
    res.status(200).json({ error: "" });
  });

  app.post("/api/delete-account", requireAuth, async (req: AuthedRequest, res) => {
    const { password } = req.body;
    if (!password) return res.status(200).json({ error: "Password required" });

    const user = await db.collection("Users").findOne({ UserID: req.user!.userId });
    if (!user) return res.status(200).json({ error: "User not found" });

    const match = await bcrypt.compare(password, user.Password);
    if (!match) return res.status(200).json({ error: "Password is incorrect" });

    await Promise.all([
      db.collection("Users").deleteOne({ UserID: req.user!.userId }),
      db.collection("Stats").deleteOne({ userId: req.user!.userId }),
      db.collection("Games").deleteMany({ userId: req.user!.userId }),
      db.collection("Themes").deleteOne({ userId: req.user!.userId }),
    ]);
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

  function opponentRematchRequested(game: any, myUid: string): boolean {
    const oppUid = Object.keys(game.players).find((id) => id !== myUid);
    return !!(oppUid && game.rematch?.[oppUid]);
  }

  async function makeRoomCode(db: Db): Promise<string> {
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O to avoid confusion
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = Array.from({ length: 4 }, () =>
        letters[Math.floor(Math.random() * letters.length)]
      ).join("");
      const existing = await db.collection("Versus").findOne({ code, status: { $ne: "done" } });
      if (!existing) return code;
    }
    throw new Error("Could not generate unique code");
  }

  function opponentPublicState(game: any, myUid: string) {
    const oppUid = Object.keys(game.players).find((id) => id !== myUid);
    if (!oppUid) return null; // opponent hasn't joined yet
    const o = game.players[oppUid];
    return {
      login: o.login,
      guessCount: o.guesses.length,
      finished: o.finished,
      won: o.won,
    };
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
