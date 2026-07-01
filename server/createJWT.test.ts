import { describe, it, expect, beforeAll } from "vitest";
import jwt from "jsonwebtoken";
import { createToken, createRefreshToken, verifyRefreshToken } from "./createJWT";

beforeAll(() => {
  process.env.ACCESS_TOKEN_SECRET = "test-access-secret";
  process.env.REFRESH_TOKEN_SECRET = "test-refresh-secret";
});

describe("createToken", () => {
  it("returns an accessToken string", () => {
    const { accessToken } = createToken("alice", 1);
    expect(typeof accessToken).toBe("string");
    expect(accessToken.split(".")).toHaveLength(3); // JWT structure
  });
});

describe("createRefreshToken", () => {
  it("returns a JWT string", () => {
    const token = createRefreshToken("alice", 1);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });
});

describe("verifyRefreshToken", () => {
  it("returns the payload for a valid token", () => {
    const token = createRefreshToken("alice", 42);
    const payload = verifyRefreshToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.login).toBe("alice");
    expect(payload!.userId).toBe(42);
  });

  it("returns null for a tampered token", () => {
    const token = createRefreshToken("alice", 1);
    const tampered = token.slice(0, -5) + "xxxxx";
    expect(verifyRefreshToken(tampered)).toBeNull();
  });

  it("returns null for a token signed with the wrong secret", () => {
    const wrongToken = jwt.sign({ userId: 1, login: "alice" }, "wrong-secret");
    expect(verifyRefreshToken(wrongToken)).toBeNull();
  });

  it("returns null for a completely invalid string", () => {
    expect(verifyRefreshToken("not.a.token")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(verifyRefreshToken("")).toBeNull();
  });
});
