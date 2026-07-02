import type { Express, Response } from "express";
import type { Db } from "mongodb";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import { randomInt } from "crypto";
import { Resend } from "resend";

import { createToken, createRefreshToken, verifyRefreshToken } from "../createJWT";
import { SALT_ROUNDS } from "./shared";

const resend = new Resend(process.env.RESEND_API_KEY);

function generateOTP(): string {
  return String(randomInt(100000, 1000000));
}

const REFRESH_COOKIE = "refresh_token";
const IS_PROD = process.env.NODE_ENV === "production";

// atomically allocate the next UserID; the counter is seeded from the current
// max at startup (see index.ts), so concurrent registers can't collide
async function nextUserId(db: Db): Promise<number> {
  const counter = await db.collection<{ _id: string; seq: number }>("Counters").findOneAndUpdate(
    { _id: "userId" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return counter!.seq;
}

function setRefreshCookie(res: Response, token: string, rememberMe: boolean) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "strict" : "lax",
    ...(rememberMe ? { maxAge: 30 * 24 * 60 * 60 * 1000 } : {}),
    path: "/api/auth",
  });
}

async function sendVerificationOTP(db: Db, user: { Login: string; Email: string; UserID: number }): Promise<string | null> {
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

  await db.collection("EmailVerifications").deleteMany({ userId: user.UserID });
  await db.collection("EmailVerifications").insertOne({ code, userId: user.UserID, expiresAt });

  const { error } = await resend.emails.send({
    from: "Knightle <noreply@knightle.xyz>",
    to: user.Email,
    subject: "Verify your Knightle account",
    html: `
      <p>Hi ${user.Login},</p>
      <p>Your verification code is: <strong style="font-size:1.5em;letter-spacing:0.2em">${code}</strong></p>
      <p>This code expires in 15 minutes.</p>
      <p>If you didn't create an account, you can ignore this email.</p>
    `,
  });

  return error ? "Failed to send verification email" : null;
}

export function registerAuthRoutes(app: Express, db: Db) {
  const checkUsernameLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { error: "Too many requests, try again later" },
  });

  app.post("/api/check-username", checkUsernameLimiter, async (req, res) => {
    const { login, email } = req.body;
    if (!login || !/^[a-zA-Z0-9_-]{3,20}$/.test(login)) {
      return res.status(200).json({ usernameAvailable: false, emailAvailable: true });
    }
    const [byLogin, byEmail] = await Promise.all([
      db.collection("Users").findOne({ Login: login }),
      email ? db.collection("Users").findOne({ Email: { $regex: new RegExp(`^${email.trim()}$`, "i") } }) : Promise.resolve(null),
    ]);
    res.status(200).json({ usernameAvailable: !byLogin, emailAvailable: !byEmail });
  });

  const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: "Too many attempts, try again later" },
  });

  app.post("/api/register", registerLimiter, async (req, res) => {
    const { login, password, email } = req.body;
    if (!login || !password || !email) {
      return res.status(200).json({ error: "Username, email, and password required" });
    }

    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(login)) {
      return res.status(200).json({ error: "Username must be 3–20 characters: letters, numbers, _ or -" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(200).json({ error: "Invalid email address" });
    }

    const [byLogin, byEmail] = await Promise.all([
      db.collection("Users").findOne({ Login: login }),
      db.collection("Users").findOne({ Email: { $regex: new RegExp(`^${email.trim()}$`, "i") } }),
    ]);
    if (byLogin) return res.status(200).json({ error: "Username already taken" });
    if (byEmail) return res.status(200).json({ error: "Email already registered" });

    const nextId = await nextUserId(db);
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const user = {
      UserID: nextId,
      Login: login,
      Email: email,
      Password: hashed,
      EmailVerified: false,
    };
    try {
      await db.collection("Users").insertOne(user);
    } catch (e: any) {
      if (e?.code === 11000) return res.status(200).json({ error: "Username already taken" });
      throw e;
    }

    const emailError = await sendVerificationOTP(db, user);
    if (emailError) return res.status(200).json({ error: emailError });

    res.status(200).json({ verificationPending: true, login: user.Login });
  });

  const verifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: "Too many attempts, try again later" },
  });

  app.post("/api/verify-email", verifyLimiter, async (req, res) => {
    const { login, code } = req.body;
    if (!login || !code) {
      return res.status(200).json({ error: "Login and code are required" });
    }

    const user = await db.collection("Users").findOne({ Login: login });
    if (!user) return res.status(200).json({ error: "User not found" });

    const record = await db.collection("EmailVerifications").findOne({ userId: user.UserID });
    if (!record) return res.status(200).json({ error: "No verification pending — request a new code" });
    if (record.expiresAt < new Date()) {
      await db.collection("EmailVerifications").deleteOne({ userId: user.UserID });
      return res.status(200).json({ error: "Code expired — request a new one" });
    }
    if (record.code !== String(code)) {
      return res.status(200).json({ error: "Incorrect code" });
    }

    await db.collection("Users").updateOne({ UserID: user.UserID }, { $set: { EmailVerified: true } });
    await db.collection("EmailVerifications").deleteOne({ userId: user.UserID });

    const token = createToken(user.Login, user.UserID);
    const refreshToken = createRefreshToken(user.Login, user.UserID);
    setRefreshCookie(res, refreshToken, false);
    res.status(200).json({ id: user.UserID, login: user.Login, ...token });
  });

  const resendVerifyLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 3,
    message: { error: "Too many resend attempts, please wait" },
  });

  app.post("/api/resend-verification", resendVerifyLimiter, async (req, res) => {
    const { login } = req.body;
    if (!login) return res.status(200).json({ error: "Login required" });

    const user = await db.collection("Users").findOne({ Login: login });
    if (!user) return res.status(200).json({ error: "" }); // don't leak whether user exists
    if (user.EmailVerified) return res.status(200).json({ error: "" });

    const emailError = await sendVerificationOTP(db, { Login: user.Login as string, Email: user.Email as string, UserID: user.UserID as number });
    if (emailError) return res.status(200).json({ error: emailError });

    res.status(200).json({ error: "" });
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
