import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import cookieParser from "cookie-parser";
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
const passwordResets: Record<string, any> = {};
const users: Record<string, any> = {
  1: { UserID: 1, Login: "alice", Email: "alice@test.com", Password: "$hashed" },
};

function makeCollection(name: string) {
  if (name === "PasswordResets") {
    return {
      findOne: vi.fn(({ token }: any) => Promise.resolve(passwordResets[token] ?? null)),
      insertOne: vi.fn(({ token, userId, expiresAt }: any) => {
        passwordResets[token] = { token, userId, expiresAt };
        return Promise.resolve({});
      }),
      deleteMany: vi.fn(({ userId }: any) => {
        for (const k of Object.keys(passwordResets)) {
          if (passwordResets[k].userId === userId) delete passwordResets[k];
        }
        return Promise.resolve({});
      }),
      deleteOne: vi.fn(({ token }: any) => {
        delete passwordResets[token];
        return Promise.resolve({});
      }),
    };
  }
  if (name === "Users") {
    return {
      findOne: vi.fn(({ Email, UserID }: any) => {
        if (Email) {
          const u = Object.values(users).find(
            (u: any) => u.Email.toLowerCase() === (Email?.$regex ? null : Email?.toLowerCase?.())
              || (Email?.$regex && Email.$regex.test(u.Email))
          );
          return Promise.resolve(u ?? null);
        }
        return Promise.resolve(users[UserID] ?? null);
      }),
      updateOne: vi.fn(() => Promise.resolve({})),
    };
  }
  // fallback no-op collection for other collections setApp touches at definition time
  return {
    findOne: vi.fn().mockResolvedValue(null),
    find: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }) }) }),
    insertOne: vi.fn().mockResolvedValue({}),
    updateOne: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({}),
    deleteOne: vi.fn().mockResolvedValue({}),
    toArray: vi.fn().mockResolvedValue([]),
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
  process.env.CLIENT_ORIGIN = "http://localhost:5173";

  app = express();
  app.use(express.json());
  app.use(cookieParser());
  setApp(app, mockClient);
});

beforeEach(() => {
  // Clear stored tokens between tests
  for (const k of Object.keys(passwordResets)) delete passwordResets[k];
});

// --- /api/forgot-password ---
describe("POST /api/forgot-password", () => {
  it("returns error for missing email", async () => {
    const res = await request(app).post("/api/forgot-password").send({});
    expect(res.body.error).toBe("Email is required");
  });

  it("returns success without sending email for unknown email", async () => {
    const res = await request(app)
      .post("/api/forgot-password")
      .send({ email: "nobody@test.com" });
    expect(res.body.error).toBe("");
    expect(Object.keys(passwordResets)).toHaveLength(0);
  });

  it("stores a token and returns success for a known email", async () => {
    const res = await request(app)
      .post("/api/forgot-password")
      .send({ email: "alice@test.com" });
    expect(res.body.error).toBe("");
    expect(Object.keys(passwordResets)).toHaveLength(1);
  });

  it("replaces any existing token for the same user", async () => {
    await request(app).post("/api/forgot-password").send({ email: "alice@test.com" });
    await request(app).post("/api/forgot-password").send({ email: "alice@test.com" });
    expect(Object.keys(passwordResets)).toHaveLength(1);
  });

  it("stores a token that expires in ~1 hour", async () => {
    await request(app).post("/api/forgot-password").send({ email: "alice@test.com" });
    const record = Object.values(passwordResets)[0] as any;
    const diffMs = record.expiresAt.getTime() - Date.now();
    expect(diffMs).toBeGreaterThan(59 * 60 * 1000);
    expect(diffMs).toBeLessThan(61 * 60 * 1000);
  });
});

// --- /api/reset-password-token ---
describe("POST /api/reset-password-token", () => {
  it("returns error for missing fields", async () => {
    const res = await request(app).post("/api/reset-password-token").send({});
    expect(res.body.error).toBe("Token and new password are required");
  });

  it("returns error for password shorter than 6 characters", async () => {
    const res = await request(app)
      .post("/api/reset-password-token")
      .send({ token: "abc", newPassword: "123" });
    expect(res.body.error).toBe("Password must be at least 6 characters");
  });

  it("returns error for invalid token", async () => {
    const res = await request(app)
      .post("/api/reset-password-token")
      .send({ token: "nonexistent", newPassword: "newpassword123" });
    expect(res.body.error).toBe("Invalid or expired reset link");
  });

  it("returns error for expired token", async () => {
    const expiredToken = "expiredtoken123";
    passwordResets[expiredToken] = {
      token: expiredToken,
      userId: 1,
      expiresAt: new Date(Date.now() - 1000), // already expired
    };

    const res = await request(app)
      .post("/api/reset-password-token")
      .send({ token: expiredToken, newPassword: "newpassword123" });
    expect(res.body.error).toBe("Reset link has expired");
    expect(passwordResets[expiredToken]).toBeUndefined();
  });

  it("resets the password and deletes the token on success", async () => {
    // First request a reset to plant a valid token
    await request(app).post("/api/forgot-password").send({ email: "alice@test.com" });
    const token = Object.keys(passwordResets)[0];

    const res = await request(app)
      .post("/api/reset-password-token")
      .send({ token, newPassword: "newpassword123" });

    expect(res.body.error).toBe("");
    expect(passwordResets[token]).toBeUndefined();
  });

  it("token cannot be reused after a successful reset", async () => {
    await request(app).post("/api/forgot-password").send({ email: "alice@test.com" });
    const token = Object.keys(passwordResets)[0];

    await request(app)
      .post("/api/reset-password-token")
      .send({ token, newPassword: "newpassword123" });

    const res = await request(app)
      .post("/api/reset-password-token")
      .send({ token, newPassword: "anotherpassword" });
    expect(res.body.error).toBe("Invalid or expired reset link");
  });
});
