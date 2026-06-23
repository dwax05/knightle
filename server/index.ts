import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import { setApp } from "./api";

const app = express();
app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI ?? "mongodb://mongo:27017";
const client = new MongoClient(uri);

async function start() {
  await client.connect();
  console.log("db connected");

  setApp(app, client);

  app.listen(3500, () => console.log("server on :3500"));
}

start().catch(console.error);
