import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { MongoClient } from "mongodb";
import { setApp } from "./api";

const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10kb" }));
app.use(helmet());
app.use(cookieParser());

const uri = process.env.MONGO_URI ?? "mongodb://mongo:27017";
const client = new MongoClient(uri);

async function start() {
  await client.connect();
  console.log("db connected");

  await client.db().collection("Users").createIndex({ Login: 1 }, { unique: true });
  await client.db().collection("Stats").createIndex({ userId: 1 }, { unique: true });
  await client.db().collection("Versus").createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 4 * 60 * 60 } // 4 hours
  );

  setApp(app, client);
  app.listen(3500, () => console.log("server on :3500"));
}

start().catch(console.error);
