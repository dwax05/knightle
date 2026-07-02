import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { setApp } from "./api";

// Mock resend before any imports resolve it
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: vi.fn().mockResolvedValue({ error: null }) };
  },
}));

// Mock rate-limit to a no-op so tests aren't throttled
vi.mock("express-rate-limit", () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
  rateLimit: () => (_req: any, _res: any, next: any) => next(),
}));

// --- Mock MongoDB ---
// Behaves like the real Users collection: unique indexes on Login and UserID
// (see index.ts) reject duplicate inserts with Mongo's E11000 error code.
const users: any[] = [];
let counterSeq = 0;

// small delay so concurrent requests interleave and expose races
const tick = () => new Promise((r) => setTimeout(r, 5));

function makeCollection(name: string) {
  if (name === "Users") {
    return {
      findOne: vi.fn(async ({ Login }: any) => {
        await tick();
        return users.find((u) => u.Login === Login) ?? null;
      }),
      insertOne: vi.fn(async (user: any) => {
        await tick();
        if (users.some((u) => u.Login === user.Login || u.UserID === user.UserID)) {
          const err: any = new Error("E11000 duplicate key error");
          err.code = 11000;
          throw err;
        }
        users.push(user);
        return {};
      }),
    };
  }
  if (name === "Counters") {
    return {
      // findOneAndUpdate with $inc is atomic in Mongo; the mock mirrors that
      // by incrementing synchronously before yielding
      findOneAndUpdate: vi.fn(async () => {
        const seq = ++counterSeq;
        await tick();
        return { _id: "userId", seq };
      }),
    };
  }
  // fallback no-op collection (covers EmailVerifications etc.)
  return {
    findOne: vi.fn().mockResolvedValue(null),
    insertOne: vi.fn().mockResolvedValue({}),
    updateOne: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({}),
  };
}

const mockClient = {
  db: vi.fn().mockReturnValue({ collection: vi.fn((name: string) => makeCollection(name)) }),
} as any;

// --- App setup ---
let app: express.Express;

beforeAll(() => {
  process.env.ACCESS_TOKEN_SECRET = "test-access-secret";
  process.env.REFRESH_TOKEN_SECRET = "test-refresh-secret";
  process.env.RESEND_API_KEY = "test-resend-key";

  app = express();
  app.use(express.json());
  setApp(app, mockClient);
});

beforeEach(() => {
  users.length = 0;
  counterSeq = 0;
});

function register(login: string, email = `${login}@test.com`) {
  return request(app)
    .post("/api/register")
    .send({ login, password: "password123", email });
}

describe("POST /api/register", () => {
  it("registers a user and returns verificationPending", async () => {
    const res = await register("alice");
    expect(res.body.error).toBeUndefined();
    expect(res.body.verificationPending).toBe(true);
    expect(res.body.login).toBe("alice");
  });

  it("rejects a username that is already taken", async () => {
    await register("alice");
    const res = await register("alice", "other@test.com");
    expect(res.body.error).toBe("Username already taken");
  });

  it("assigns unique ids to concurrent registrations", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => register(`user${i}`))
    );

    const pending = results.filter((r) => r.body.verificationPending);
    expect(pending).toHaveLength(10);
    expect(users).toHaveLength(10);
  });

  it("rejects the loser when the same login registers concurrently", async () => {
    const [a, b] = await Promise.all([register("dupe"), register("dupe")]);

    const bodies = [a.body, b.body];
    const winners = bodies.filter((r) => r.verificationPending);
    const losers = bodies.filter((r) => r.error);

    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    expect(losers[0].error).toBe("Username already taken");
    expect(users).toHaveLength(1);
  });
});
