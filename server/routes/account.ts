import type { Express } from "express";
import type { Db } from "mongodb";
import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import { Resend } from "resend";

import { requireAuth, type AuthedRequest } from "../auth";
import { SALT_ROUNDS } from "./shared";

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendPasswordResetLink(db: Db, user: { UserID: number; Login: string; Email: string }): Promise<string | null> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db.collection("PasswordResets").deleteMany({ userId: user.UserID });
  await db.collection("PasswordResets").insertOne({ token, userId: user.UserID, expiresAt });

  const resetUrl = `${process.env.CLIENT_ORIGIN}?token=${token}`;
  const { error } = await resend.emails.send({
    from: "Knightle <noreply@knightle.xyz>",
    to: user.Email,
    subject: "Reset your Knightle password",
    html: `
      <p>Hi ${user.Login},</p>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });

  return error ? "Failed to send email, please try again" : null;
}

export function registerAccountRoutes(app: Express, db: Db) {
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

  const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.post("/api/forgot-password", forgotPasswordLimiter, async (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(200).json({ error: "Email is required" });
    }

    const normalized = email.toLowerCase().trim();
    const user = await db.collection("Users").findOne({
      Email: { $regex: new RegExp(`^${normalized}$`, "i") },
    });

    // Always respond the same way to avoid leaking whether an email exists
    if (!user) return res.status(200).json({ error: "" });

    const emailError = await sendPasswordResetLink(db, { UserID: user.UserID as number, Login: user.Login as string, Email: user.Email as string });
    if (emailError) {
      console.error("[forgot-password] resend error:", emailError);
      return res.status(200).json({ error: emailError });
    }

    res.status(200).json({ error: "" });
  });

  app.post("/api/send-password-reset", requireAuth, forgotPasswordLimiter, async (req: AuthedRequest, res) => {
    const user = await db.collection("Users").findOne({ UserID: req.user!.userId });
    if (!user) return res.status(200).json({ error: "User not found" });

    const emailError = await sendPasswordResetLink(db, { UserID: user.UserID as number, Login: user.Login as string, Email: user.Email as string });
    if (emailError) return res.status(200).json({ error: emailError });

    res.status(200).json({ error: "" });
  });

  app.post("/api/reset-password-token", async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(200).json({ error: "Token and new password are required" });
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(200).json({ error: "Password must be at least 6 characters" });
    }

    const record = await db.collection("PasswordResets").findOne({ token });
    if (!record) return res.status(200).json({ error: "Invalid or expired reset link" });
    if (record.expiresAt < new Date()) {
      await db.collection("PasswordResets").deleteOne({ token });
      return res.status(200).json({ error: "Reset link has expired" });
    }

    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.collection("Users").updateOne(
      { UserID: record.userId },
      { $set: { Password: hashed } }
    );
    await db.collection("PasswordResets").deleteOne({ token });

    res.status(200).json({ error: "" });
  });

  app.post("/api/clear-game-data", requireAuth, async (req: AuthedRequest, res) => {
    await Promise.all([
      db.collection("Stats").deleteOne({ userId: req.user!.userId }),
      db.collection("Games").deleteMany({ userId: req.user!.userId }),
      db.collection("GameArchive").deleteMany({ userId: req.user!.userId }),
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
      db.collection("GameArchive").deleteMany({ userId: req.user!.userId }),
      db.collection("Themes").deleteOne({ userId: req.user!.userId }),
    ]);
    res.status(200).json({ error: "" });
  });
}
