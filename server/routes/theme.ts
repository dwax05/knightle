import type { Express } from "express";
import type { Db } from "mongodb";

import { requireAuth, type AuthedRequest } from "../auth";

export function registerThemeRoutes(app: Express, db: Db) {
  app.post("/api/theme/get", requireAuth, async (req: AuthedRequest, res) => {
    const doc = await db.collection("Themes").findOne({ userId: req.user!.userId });
    res.status(200).json({
      css: doc?.css ?? "",
      slots: doc?.slots?.slice(0, 3) ?? [null, null, null],
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
    if (!Array.isArray(slots) || slots.length !== 3) {
      return res.status(200).json({ error: "Invalid slots" });
    }
    await db.collection("Themes").updateOne(
      { userId: req.user!.userId },
      { $set: { userId: req.user!.userId, slots, updatedAt: new Date() } },
      { upsert: true }
    );
    res.status(200).json({ error: "" });
  });
}
