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

  setApp(app, client);
  app.listen(3500, () => console.log("server on :3500"));
}

start().catch(console.error);
