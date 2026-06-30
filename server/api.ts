import type { Express } from "express";
import type { MongoClient, Db } from "mongodb";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";

import { createToken, createRefreshToken, verifyRefreshToken } from "./createJWT";
import { requireAuth, type AuthedRequest } from "./auth";
import { ANSWERS, VALID_GUESSES } from "./words";
import { scoreGuess } from "./wordle";

const SALT_ROUNDS = 10;
const MAX_GUESSES = 6;
const REFRESH_COOKIE = "refresh_token";
const IS_PROD = process.env.NODE_ENV === "production";

function setRefreshCookie(res: any, token: string, rememberMe: boolean) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "strict" : "lax",
    ...(rememberMe ? { maxAge: 30 * 24 * 60 * 60 * 1000 } : {}),
    path: "/api/auth",
  });
}

export function setApp(app: Express, client: MongoClient) {
  const db = client.db();

  app.post("/api/register", async (req, res) => {
    const { login, password, email } = req.body;
    if (!login || !password || !email) {
      return res.status(200).json({ error: "Username, email, and password required" });
    }

    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(login)) {
      return res.status(200).json({ error: "Username must be 3–20 characters: letters, numbers, _ or -" });
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
    const refreshToken = createRefreshToken(user.Login, user.UserID);
    setRefreshCookie(res, refreshToken, false);
    res.status(200).json({ id: user.UserID, login: user.Login, ...token });
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 10,                   // 10 attempts per window per IP
    message: { error: "Too many attempts, try again later" },
  });

  app.post("/api/login", loginLimiter, async (req, res) => {
    const { login, password, rememberMe } = req.body;

    const user = await db.collection("Users").findOne({ Login: login });
    if (!user) {
      return res.status(200).json({ error: "Login/Password incorrect" });
    }

    const match = await bcrypt.compare(password, user.Password);
    if (!match) {
      return res.status(200).json({ error: "Login/Password incorrect" });
    }

    const token = createToken(user.Login, user.UserID);
    const refreshToken = createRefreshToken(user.Login, user.UserID);
    setRefreshCookie(res, refreshToken, !!rememberMe);
    res.status(200).json({ id: user.UserID, login: user.Login, ...token });
  });

  app.post("/api/auth/refresh", (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) return res.status(401).json({ error: "No refresh token" });

    const payload = verifyRefreshToken(token);
    if (!payload) {
      res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    const { accessToken } = createToken(payload.login, payload.userId);
    // re-issue refresh cookie preserving its type (session vs persistent)
    const hasMaxAge = !!req.cookies[REFRESH_COOKIE];
    const newRefresh = createRefreshToken(payload.login, payload.userId);
    // check if original cookie was persistent by seeing if it will outlive a session
    // we can't read maxAge from the cookie itself, so we re-issue without maxAge (session cookie)
    // unless the client tells us rememberMe via a header
    const rememberMe = req.headers["x-remember-me"] === "1";
    setRefreshCookie(res, newRefresh, rememberMe);
    res.status(200).json({ accessToken, id: payload.userId, login: payload.login });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
    res.status(200).json({ error: "" });
  });

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
    const guessNum = game.guesses.length + 1;
    const won = marks.every((m) => m === "correct");
    const lost = !won && guessNum >= MAX_GUESSES;
    const finished = won || lost;

    await db.collection("Games").updateOne({ gameId }, { $set: { finished } });
    await db.collection("Games").updateOne({ gameId }, { $push: { guesses: g, marks } });

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
    const sort = req.body.sort;

    if (sort === "today") {
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);

      const top = await db.collection("GameHistory").aggregate([
        { $match: { won: true, playedAt: { $gte: startOfDay } } },
        { $group: { _id: "$userId", wins: { $sum: 1 } } },
        { $sort: { wins: -1 } },
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
        { $sort: { [sortField]: -1 } },
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
    const stats = await db
      .collection("Stats")
      .findOne({ userId: req.user!.userId });
    res.status(200).json({ stats: stats ?? emptyStats(req.user!.userId), error: "" });
  });

  app.post("/api/theme/get", requireAuth, async (req: AuthedRequest, res) => {
    const doc = await db.collection("Themes").findOne({ userId: req.user!.userId });
    res.status(200).json({
      css: doc?.css ?? "",
      slots: doc?.slots ?? [null, null, null, null],
      error: "",
    });
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

  app.post("/api/theme/slots", requireAuth, async (req: AuthedRequest, res) => {
    const { slots } = req.body;
    if (!Array.isArray(slots) || slots.length !== 4) {
      return res.status(200).json({ error: "Invalid slots" });
    }
    await db.collection("Themes").updateOne(
      { userId: req.user!.userId },
      { $set: { userId: req.user!.userId, slots, updatedAt: new Date() } },
      { upsert: true }
    );
    res.status(200).json({ error: "" });
  });

  // player 1 starts a room
  app.post("/api/versus/create", requireAuth, async (req: AuthedRequest, res) => {
    const code = await makeRoomCode(db);
    const answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
    const uid = String(req.user!.userId);
    const mode = req.body.mode === "precision" ? "precision" : "speed";

    await db.collection("Versus").insertOne({
      code,
      answer,
      players: {
        [uid]: makePlayer(req.user!.login),
      },
      winner: null,
      status: "waiting",
      mode,
      createdAt: new Date(),
    });

    res.status(200).json({ code, mode, error: "" });
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
      return res.status(200).json({ error: "", code: game.code, mode: game.mode ?? "speed" }); // rejoining own room

    await db.collection("Versus").updateOne(
      { code: game.code },
      {
        $set: {
          [`players.${uid}`]: makePlayer(req.user!.login),
          status: "active",
        },
      }
    );

    res.status(200).json({ code: game.code, mode: game.mode ?? "speed", error: "" });
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
    const mode = game.mode ?? "speed";

    const update: any = {
      $push: { [`players.${uid}.guesses`]: g },
      $set: {
        [`players.${uid}.finished`]: finished,
        [`players.${uid}.won`]: won,
      },
    };

    if (mode === "speed") {
      if (won) {
        await db.collection("Versus").updateOne(
          { code: game.code, winner: null },
          { $set: { winner: req.user!.userId, status: "done" } }
        );
      }
      await db.collection("Versus").updateOne({ code: game.code }, update);
    } else {
      await db.collection("Versus").updateOne({ code: game.code }, update);
      if (finished) {
        const afterUpdate = await db.collection("Versus").findOne({ code: game.code });
        const playerEntries = Object.entries(afterUpdate!.players);
        const allFinished = playerEntries.every(([, p]: any) => p.finished);
        if (allFinished && afterUpdate!.status !== "done") {
          const solvers = playerEntries.filter(([, p]: any) => (p as any).won);
          let roomWinner: number | null = null;
          if (solvers.length === 1 && solvers[0]) {
            roomWinner = Number(solvers[0][0]);
          } else if (solvers.length === 2) {
            const [id1, p1] = solvers[0] as [string, any];
            const [id2, p2] = solvers[1] as [string, any];
            if (p1.guesses.length < p2.guesses.length) roomWinner = Number(id1);
            else if (p2.guesses.length < p1.guesses.length) roomWinner = Number(id2);
            // equal guess count = draw (null)
          }
          await db.collection("Versus").updateOne(
            { code: game.code },
            { $set: { winner: roomWinner, status: "done" } }
          );
        }
      }
    }

    // return this player's marks + opponent's public state
    const updated = await db.collection("Versus").findOne({ code: game.code });
    res.status(200).json({
      marks,
      won,
      finished,
      guessNum: newGuessCount,
      round: updated!.round ?? 0,
      mode: updated!.mode ?? "speed",
      answer: finished ? game.answer : undefined,
      opponent: opponentPublicState(updated, uid),
      winner: updated!.winner,
      status: updated!.status,
      error: "",
    });
  });

  // STATE — for polling the opponent's progress and restoring state on rejoin
  app.post("/api/versus/state", requireAuth, async (req: AuthedRequest, res) => {
    const { code } = req.body;
    const uid = String(req.user!.userId);
    const game = await db.collection("Versus").findOne({ code: code?.toUpperCase() });
    if (!game || !game.players[uid]) return res.status(200).json({ error: "No active game" });

    const player = game.players[uid];
    const myGuesses: string[] = player.guesses ?? [];
    const myMarks = myGuesses.map((g: string) => scoreGuess(g, game.answer));

    res.status(200).json({
      status: game.status,
      winner: game.winner,
      round: game.round ?? 0,
      mode: game.mode ?? "speed",
      answer: (game.status === "done" || player.finished) ? game.answer : undefined,
      opponent: opponentPublicState(game, uid),
      rematch: {
        me: !!game.rematch?.[uid],
        opponent: opponentRematchRequested(game, uid),
      },
      myGuesses,
      myMarks,
      myFinished: player.finished,
      myWon: player.won,
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
        resetPlayers[id] = makePlayer((p as any).login);
      }
      await db.collection("Versus").updateOne(
        { code },
        {
          $set: {
            answer: newAnswer,
            players: resetPlayers,
            winner: null,
            status: "active",
            mode: updated!.mode ?? "speed",
            createdAt: new Date(),
          },
          $unset: { rematch: "" },
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
    await Promise.all([
      db.collection("Stats").updateOne({ userId }, { $set: stats }, { upsert: true }),
      db.collection("GameHistory").insertOne({ userId, won, guessNum, playedAt: new Date() }),
    ]);
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

  function makePlayer(login: string) {
    return { login, guesses: [] as string[], finished: false, won: false };
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
