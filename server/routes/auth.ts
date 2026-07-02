import type { Express, Response } from "express";
import type { Db } from "mongodb";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";

import { createToken, createRefreshToken, verifyRefreshToken } from "../createJWT";
import { SALT_ROUNDS } from "./shared";

const REFRESH_COOKIE = "refresh_token";
const IS_PROD = process.env.NODE_ENV === "production";

function setRefreshCookie(res: Response, token: string, rememberMe: boolean) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "strict" : "lax",
    ...(rememberMe ? { maxAge: 30 * 24 * 60 * 60 * 1000 } : {}),
    path: "/api/auth",
  });
}

export function registerAuthRoutes(app: Express, db: Db) {
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
    const newRefresh = createRefreshToken(payload.login, payload.userId);
    const rememberMe = req.headers["x-remember-me"] === "1";
    setRefreshCookie(res, newRefresh, rememberMe);
    res.status(200).json({ accessToken, id: payload.userId, login: payload.login });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
    res.status(200).json({ error: "" });
  });
}
