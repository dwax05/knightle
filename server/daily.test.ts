import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import cookieParser from "cookie-parser";
import { setApp } from "./api";
import { createToken } from "./createJWT";
import { getDayNumber, getDailyWord, getEstDateString } from "./routes/daily";
import { ANSWERS } from "./words";

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: vi.fn().mockResolvedValue({ error: null }) };
  },
}));

vi.mock("express-rate-limit", () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
  rateLimit: () => (_req: any, _res: any, next: any) => next(),
}));

// --- Mock MongoDB ---
const dailyGames: Record<string, any> = {};
const statsStore: Record<number, any> = {};

function makeCollection(name: string) {
  if (name === "DailyGames") {
    return {
      findOneAndUpdate: vi.fn(({ userId, date }: any, update: any, _opts: any) => {
        const key = `${userId}:${date}`;
        if (!dailyGames[key]) {
          dailyGames[key] = { ...update.$setOnInsert };
        }
        return Promise.resolve(dailyGames[key]);
      }),
      findOne: vi.fn(({ userId, date }: any) =>
        Promise.resolve(dailyGames[`${userId}:${date}`] ?? null)
      ),
      updateOne: vi.fn(({ userId, date }: any, update: any) => {
        const game = dailyGames[`${userId}:${date}`];
        if (!game) return Promise.resolve({});
        if (update.$set) Object.assign(game, update.$set);
        if (update.$push) {
          for (const [field, val] of Object.entries(update.$push as Record<string, unknown>)) {
            if (!Array.isArray(game[field])) game[field] = [];
            game[field].push(val);
          }
        }
        return Promise.resolve({});
      }),
      deleteMany: vi.fn().mockResolvedValue({}),
    };
  }

  if (name === "Stats") {
    return {
      findOne: vi.fn(({ userId }: any) => Promise.resolve(statsStore[userId] ?? null)),
      updateOne: vi.fn(({ userId }: any, update: any, opts: any) => {
        const isInsert = !statsStore[userId];
        if (isInsert) {
          if (!opts?.upsert) return Promise.resolve({});
          statsStore[userId] = { userId };
        }
        const s = statsStore[userId];
        if (isInsert && update.$setOnInsert) Object.assign(s, update.$setOnInsert);
        if (update.$inc) {
          for (const [k, v] of Object.entries(update.$inc as Record<string, number>)) {
            s[k] = (s[k] ?? 0) + v;
          }
        }
        if (update.$max) {
          for (const [k, v] of Object.entries(update.$max as Record<string, number>)) {
            s[k] = Math.max(s[k] ?? 0, v as number);
          }
        }
        if (update.$set) Object.assign(s, update.$set);
        return Promise.resolve({});
      }),
      deleteOne: vi.fn().mockResolvedValue({}),
    };
  }

  return {
    findOne: vi.fn().mockResolvedValue(null),
    findOneAndUpdate: vi.fn().mockResolvedValue(null),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          next: vi.fn().mockResolvedValue(null),
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insertOne: vi.fn().mockResolvedValue({}),
    updateOne: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({}),
    deleteOne: vi.fn().mockResolvedValue({}),
    aggregate: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
  };
}

const mockClient = {
  db: vi.fn().mockReturnValue({ collection: vi.fn((name: string) => makeCollection(name)) }),
} as any;

let app: express.Express;
let token: string;
const TEST_USER_ID = 42;

beforeAll(() => {
  process.env.ACCESS_TOKEN_SECRET = "test-access-secret";
  process.env.REFRESH_TOKEN_SECRET = "test-refresh-secret";
  process.env.RESEND_API_KEY = "test-resend-key";
  process.env.CLIENT_ORIGIN = "http://localhost:5173";

  app = express();
  app.use(express.json());
  app.use(cookieParser());
  setApp(app, mockClient);

  token = createToken("testuser", TEST_USER_ID).accessToken;
});

beforeEach(() => {
  for (const k of Object.keys(dailyGames)) delete dailyGames[k];
  for (const k of Object.keys(statsStore)) delete (statsStore as any)[k];
  vi.clearAllMocks();
  // Re-register collection mocks after clearAllMocks
  mockClient.db.mockReturnValue({ collection: vi.fn((name: string) => makeCollection(name)) });
});

// --- Pure function tests ---

describe("getDayNumber", () => {
  it("returns 1 for the epoch date", () => {
    expect(getDayNumber("2026-07-02")).toBe(1);
  });

  it("returns 2 for the day after the epoch", () => {
    expect(getDayNumber("2026-07-03")).toBe(2);
  });

  it("increases by 1 per day", () => {
    expect(getDayNumber("2026-07-10") - getDayNumber("2026-07-09")).toBe(1);
  });
});

describe("getDailyWord", () => {
  it("returns a 5-letter lowercase word", () => {
    const word = getDailyWord("2026-07-02");
    expect(word).toMatch(/^[a-z]{5}$/);
  });

  it("is in the ANSWERS list", () => {
    expect(ANSWERS).toContain(getDailyWord("2026-07-02"));
  });

  it("is deterministic — same date always gives the same word", () => {
    expect(getDailyWord("2026-07-02")).toBe(getDailyWord("2026-07-02"));
  });

  it("produces different words on different days (spot-check)", () => {
    // Not guaranteed, but collision probability is ~0.04% per pair
    const words = new Set(
      Array.from({ length: 10 }, (_, i) => {
        const d = new Date("2026-07-02T00:00:00Z");
        d.setUTCDate(d.getUTCDate() + i);
        return getDailyWord(d.toISOString().slice(0, 10));
      })
    );
    expect(words.size).toBeGreaterThan(1);
  });
});

// --- POST /api/daily/info ---

describe("POST /api/daily/info", () => {
  it("returns no error", async () => {
    const res = await request(app).post("/api/daily/info").send({});
    expect(res.body.error).toBe("");
  });

  it("returns a dayNumber >= 1", async () => {
    const res = await request(app).post("/api/daily/info").send({});
    expect(res.body.dayNumber).toBeGreaterThanOrEqual(1);
  });

  it("returns a date in YYYY-MM-DD format", async () => {
    const res = await request(app).post("/api/daily/info").send({});
    expect(res.body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("dayNumber matches getDayNumber for the returned date", async () => {
    const res = await request(app).post("/api/daily/info").send({});
    expect(res.body.dayNumber).toBe(getDayNumber(res.body.date));
  });
});

// --- POST /api/daily/guest/guess ---

describe("POST /api/daily/guest/guess", () => {
  it("rejects a non-word", async () => {
    const res = await request(app).post("/api/daily/guest/guess").send({ guess: "zzzzz", guessNum: 1 });
    expect(res.body.error).toBe("Not a valid word");
  });

  it("rejects guessNum = 0", async () => {
    const res = await request(app).post("/api/daily/guest/guess").send({ guess: "crane", guessNum: 0 });
    expect(res.body.error).toBe("Invalid guess number");
  });

  it("rejects guessNum = 7", async () => {
    const res = await request(app).post("/api/daily/guest/guess").send({ guess: "crane", guessNum: 7 });
    expect(res.body.error).toBe("Invalid guess number");
  });

  it("returns marks array of 5 for a valid mid-game guess", async () => {
    const today = getEstDateString();
    const word = getDailyWord(today);
    const guess = word === "crane" ? "trace" : "crane"; // pick a word that isn't the answer

    const res = await request(app)
      .post("/api/daily/guest/guess")
      .send({ guess, guessNum: 1 });

    if (!res.body.won) {
      expect(res.body.error).toBe("");
      expect(res.body.marks).toHaveLength(5);
      expect(res.body.marks.every((m: string) => ["correct", "present", "absent"].includes(m))).toBe(true);
      expect(res.body.won).toBe(false);
      expect(res.body.answer).toBeUndefined();
    }
  });

  it("returns won=true and reveals answer on correct guess", async () => {
    const today = getEstDateString();
    const word = getDailyWord(today);

    const res = await request(app)
      .post("/api/daily/guest/guess")
      .send({ guess: word, guessNum: 1 });

    expect(res.body.error).toBe("");
    expect(res.body.won).toBe(true);
    expect(res.body.lost).toBe(false);
    expect(res.body.answer).toBe(word);
    expect(res.body.marks.every((m: string) => m === "correct")).toBe(true);
  });

  it("returns lost=true and reveals answer on 6th wrong guess", async () => {
    const today = getEstDateString();
    const word = getDailyWord(today);
    const wrongGuess = word === "crane" ? "trace" : "crane";

    const res = await request(app)
      .post("/api/daily/guest/guess")
      .send({ guess: wrongGuess, guessNum: 6 });

    if (!res.body.won) {
      expect(res.body.error).toBe("");
      expect(res.body.lost).toBe(true);
      expect(res.body.answer).toBe(word);
    }
  });

  it("won and lost are never both true", async () => {
    const today = getEstDateString();
    const word = getDailyWord(today);

    const res = await request(app)
      .post("/api/daily/guest/guess")
      .send({ guess: word, guessNum: 6 });

    expect(res.body.won && res.body.lost).toBe(false);
  });
});

// --- POST /api/daily/state ---

describe("POST /api/daily/state", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app).post("/api/daily/state").send({});
    expect(res.status).toBe(401);
  });

  it("creates a new game on first visit", async () => {
    const res = await request(app)
      .post("/api/daily/state")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.body.error).toBe("");
    expect(res.body.guesses).toEqual([]);
    expect(res.body.marks).toEqual([]);
    expect(res.body.done).toBe(false);
    expect(res.body.dayNumber).toBeGreaterThanOrEqual(1);
    expect(res.body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("does not reveal the answer on an incomplete game", async () => {
    const res = await request(app)
      .post("/api/daily/state")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.body.answer).toBeUndefined();
  });

  it("is idempotent — second call returns the same state", async () => {
    const r1 = await request(app)
      .post("/api/daily/state")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    const r2 = await request(app)
      .post("/api/daily/state")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(r1.body.date).toBe(r2.body.date);
    expect(r1.body.dayNumber).toBe(r2.body.dayNumber);
  });

  it("reveals the answer when the game is already done", async () => {
    const today = getEstDateString();
    dailyGames[`${TEST_USER_ID}:${today}`] = {
      userId: TEST_USER_ID,
      date: today,
      word: "crane",
      guesses: ["audio", "crane"],
      marks: [[], []],
      done: true,
      won: true,
    };

    const res = await request(app)
      .post("/api/daily/state")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.body.done).toBe(true);
    expect(res.body.answer).toBe("crane");
  });
});

// --- POST /api/daily/guess ---

describe("POST /api/daily/guess", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app).post("/api/daily/guess").send({ guess: "crane" });
    expect(res.status).toBe(401);
  });

  it("rejects a non-word", async () => {
    const today = getEstDateString();
    dailyGames[`${TEST_USER_ID}:${today}`] = {
      userId: TEST_USER_ID, date: today, word: "crane",
      guesses: [], marks: [], done: false, won: false,
    };

    const res = await request(app)
      .post("/api/daily/guess")
      .set("Authorization", `Bearer ${token}`)
      .send({ guess: "zzzzz" });

    expect(res.body.error).toBe("Not a valid word");
  });

  it("returns error when no game exists for today", async () => {
    const res = await request(app)
      .post("/api/daily/guess")
      .set("Authorization", `Bearer ${token}`)
      .send({ guess: "crane" });

    expect(res.body.error).toBe("No active daily game");
  });

  it("returns error on a completed game", async () => {
    const today = getEstDateString();
    dailyGames[`${TEST_USER_ID}:${today}`] = {
      userId: TEST_USER_ID, date: today, word: "crane",
      guesses: ["crane"], marks: [[]], done: true, won: true,
    };

    const res = await request(app)
      .post("/api/daily/guess")
      .set("Authorization", `Bearer ${token}`)
      .send({ guess: "crane" });

    expect(res.body.error).toBe("No active daily game");
  });

  it("returns marks for a valid wrong guess", async () => {
    const today = getEstDateString();
    const word = getDailyWord(today);
    const wrongGuess = word === "crane" ? "trace" : "crane";

    dailyGames[`${TEST_USER_ID}:${today}`] = {
      userId: TEST_USER_ID, date: today, word,
      guesses: [], marks: [], done: false, won: false,
    };

    const res = await request(app)
      .post("/api/daily/guess")
      .set("Authorization", `Bearer ${token}`)
      .send({ guess: wrongGuess });

    if (!res.body.won) {
      expect(res.body.error).toBe("");
      expect(res.body.marks).toHaveLength(5);
      expect(res.body.won).toBe(false);
      expect(res.body.answer).toBeUndefined();
    }
  });

  it("returns won=true and reveals answer on correct guess", async () => {
    const today = getEstDateString();
    const word = getDailyWord(today);

    dailyGames[`${TEST_USER_ID}:${today}`] = {
      userId: TEST_USER_ID, date: today, word,
      guesses: [], marks: [], done: false, won: false,
    };

    const res = await request(app)
      .post("/api/daily/guess")
      .set("Authorization", `Bearer ${token}`)
      .send({ guess: word });

    expect(res.body.error).toBe("");
    expect(res.body.won).toBe(true);
    expect(res.body.lost).toBe(false);
    expect(res.body.answer).toBe(word);
  });

  it("updates stats on a win", async () => {
    const today = getEstDateString();
    const word = getDailyWord(today);

    dailyGames[`${TEST_USER_ID}:${today}`] = {
      userId: TEST_USER_ID, date: today, word,
      guesses: [], marks: [], done: false, won: false,
    };

    await request(app)
      .post("/api/daily/guess")
      .set("Authorization", `Bearer ${token}`)
      .send({ guess: word });

    expect(statsStore[TEST_USER_ID]).toBeDefined();
    expect(statsStore[TEST_USER_ID].dailyPlayed).toBe(1);
    expect(statsStore[TEST_USER_ID].dailyWins).toBe(1);
    expect(statsStore[TEST_USER_ID].dailyCurrentStreak).toBe(1);
    expect(statsStore[TEST_USER_ID].lastDailyDate).toBe(today);
  });

  it("increments dailyPlayed but not dailyWins on a loss", async () => {
    const today = getEstDateString();
    const word = getDailyWord(today);
    const wrongGuess = word === "crane" ? "trace" : "crane";

    dailyGames[`${TEST_USER_ID}:${today}`] = {
      userId: TEST_USER_ID, date: today, word,
      guesses: ["audio", "trace", "stove", "bland", "crimp"],
      marks: [[], [], [], [], []],
      done: false, won: false,
    };

    const res = await request(app)
      .post("/api/daily/guess")
      .set("Authorization", `Bearer ${token}`)
      .send({ guess: wrongGuess });

    if (res.body.lost) {
      expect(statsStore[TEST_USER_ID].dailyPlayed).toBe(1);
      expect(statsStore[TEST_USER_ID].dailyWins ?? 0).toBe(0);
      expect(statsStore[TEST_USER_ID].dailyCurrentStreak).toBe(0);
    }
  });

  it("streak continues when lastDailyDate was yesterday", async () => {
    const today = getEstDateString();
    const word = getDailyWord(today);
    const yesterday = new Date(today + "T00:00:00Z");
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    statsStore[TEST_USER_ID] = {
      userId: TEST_USER_ID,
      dailyCurrentStreak: 3,
      dailyMaxStreak: 3,
      lastDailyDate: yesterdayStr,
    };

    dailyGames[`${TEST_USER_ID}:${today}`] = {
      userId: TEST_USER_ID, date: today, word,
      guesses: [], marks: [], done: false, won: false,
    };

    await request(app)
      .post("/api/daily/guess")
      .set("Authorization", `Bearer ${token}`)
      .send({ guess: word });

    expect(statsStore[TEST_USER_ID].dailyCurrentStreak).toBe(4);
    expect(statsStore[TEST_USER_ID].dailyMaxStreak).toBe(4);
  });

  it("streak resets to 1 when lastDailyDate was not yesterday", async () => {
    const today = getEstDateString();
    const word = getDailyWord(today);

    statsStore[TEST_USER_ID] = {
      userId: TEST_USER_ID,
      dailyCurrentStreak: 5,
      dailyMaxStreak: 5,
      lastDailyDate: "2020-01-01",
    };

    dailyGames[`${TEST_USER_ID}:${today}`] = {
      userId: TEST_USER_ID, date: today, word,
      guesses: [], marks: [], done: false, won: false,
    };

    await request(app)
      .post("/api/daily/guess")
      .set("Authorization", `Bearer ${token}`)
      .send({ guess: word });

    expect(statsStore[TEST_USER_ID].dailyCurrentStreak).toBe(1);
    expect(statsStore[TEST_USER_ID].dailyMaxStreak).toBe(5);
  });
});
