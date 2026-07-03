import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { MongoClient } from "mongodb";
import { setApp } from "./api";

const app = express();
const ALLOWED_ORIGINS = ["http://localhost:5173", "https://knightle.xyz"];
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: "10kb" }));
app.use(helmet());
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const uri = process.env.MONGO_URI ?? "mongodb://mongo:27017";
const client = new MongoClient(uri);

async function start() {
  await client.connect();
  console.log("db connected");

  await client.db().collection("Users").createIndex({ Login: 1 }, { unique: true });
  await client.db().collection("Users").createIndex({ UserID: 1 }, { unique: true });
  await client.db().collection("Stats").createIndex({ userId: 1 }, { unique: true });
  await client.db().collection("Versus").createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 4 * 60 * 60 }
  );
  await client.db().collection("PasswordResets").createIndex({ token: 1 }, { unique: true });
  await client.db().collection("PasswordResets").createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 } // MongoDB auto-deletes expired records
  );
  await client.db().collection("DailyGames").createIndex(
    { userId: 1, date: 1 },
    { unique: true }
  );

  // seed the user-id counter from the current max so registration can
  // allocate ids atomically with $inc ($setOnInsert makes this idempotent)
  const last = await client.db().collection("Users").find().sort({ UserID: -1 }).limit(1).toArray();
  await client.db().collection<{ _id: string; seq: number }>("Counters").updateOne(
    { _id: "userId" },
    { $setOnInsert: { seq: last[0]?.UserID ?? 0 } },
    { upsert: true }
  );

  setApp(app, client);
  app.listen(3500, () => console.log("server on :3500"));
}

start().catch(console.error);
