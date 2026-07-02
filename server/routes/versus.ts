import type { Express } from "express";
import type { Db } from "mongodb";

import { requireAuth, type AuthedRequest } from "../auth";
import { VALID_GUESSES } from "../words";
import { scoreGuess, randomAnswer } from "../wordle";
import { MAX_GUESSES } from "./shared";

// versus room codes are 4 uppercase letters; returns null if malformed
function parseRoomCode(body: any): string | null {
  const code = String(body?.code ?? "").toUpperCase();
  return /^[A-Z]{4}$/.test(code) ? code : null;
}

function gameMode(game: any): "speed" | "precision" {
  return game?.mode === "precision" ? "precision" : "speed";
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

function opponentRematchRequested(game: any, myUid: string): boolean {
  const oppUid = Object.keys(game.players).find((id) => id !== myUid);
  return oppUid ? game.rematch?.[oppUid] === true : false;
}

function opponentDeclined(game: any, myUid: string): boolean {
  const oppUid = Object.keys(game.players).find((id) => id !== myUid);
  return oppUid ? game.rematch?.[oppUid] === "declined" : false;
}

export function registerVersusRoutes(app: Express, db: Db) {
  // player 1 starts a room
  app.post("/api/versus/create", requireAuth, async (req: AuthedRequest, res) => {
    const code = await makeRoomCode(db);
    const answer = randomAnswer();
    const uid = String(req.user!.userId);
    const mode = gameMode(req.body);

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
    const code = parseRoomCode(req.body);
    if (!code) return res.status(200).json({ error: "Invalid code" });

    const uid = String(req.user!.userId);
    const game = await db.collection("Versus").findOne({ code: code });

    if (!game) return res.status(200).json({ error: "Room not found" });
    if (game.status !== "waiting" && !game.players[uid])
      return res.status(200).json({ error: "Room is full or already started" });
    if (game.players[uid])
      return res.status(200).json({ error: "", code: game.code, mode: gameMode(game) }); // rejoining own room

    await db.collection("Versus").updateOne(
      { code: game.code },
      {
        $set: {
          [`players.${uid}`]: makePlayer(req.user!.login),
          status: "active",
        },
      }
    );

    res.status(200).json({ code: game.code, mode: gameMode(game), error: "" });
  });

  // GUESS — score against the shared answer, record in this player's slot
  app.post("/api/versus/guess", requireAuth, async (req: AuthedRequest, res) => {
    const code = parseRoomCode(req.body);
    if (!code) return res.status(200).json({ error: "Invalid code" });

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
    const mode = gameMode(game);

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
      mode: gameMode(updated),
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
      mode: gameMode(game),
      answer: (game.status === "done" || player.finished) ? game.answer : undefined,
      opponent: opponentPublicState(game, uid),
      rematch: {
        me: !!game.rematch?.[uid],
        opponent: opponentRematchRequested(game, uid),
        opponentDeclined: opponentDeclined(game, uid),
      },
      myGuesses,
      myMarks,
      myFinished: player.finished,
      myWon: player.won,
      error: "",
    });
  });

  app.post("/api/versus/rematch", requireAuth, async (req: AuthedRequest, res) => {
    const code = parseRoomCode(req.body);
    if (!code) return res.status(200).json({ error: "Invalid code" });

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
      const newAnswer = randomAnswer();
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
            mode: gameMode(updated),
            createdAt: new Date(),
          },
          $unset: { rematch: "" },
          $inc: { round: 1 },
        }
      );
    }

    res.status(200).json({ error: "" });
  });

  app.post("/api/versus/leave", requireAuth, async (req: AuthedRequest, res) => {
    const code = parseRoomCode(req.body);
    if (!code) return res.status(200).json({ error: "Invalid code" });

    const uid = String(req.user!.userId);
    const game = await db.collection("Versus").findOne({ code });
    if (!game || !game.players[uid]) return res.status(200).json({ error: "Not in this room" });
    if (game.status !== "done") return res.status(200).json({ error: "" });

    await db.collection("Versus").updateOne(
      { code },
      { $set: { [`rematch.${uid}`]: "declined" } }
    );

    res.status(200).json({ error: "" });
  });
}
