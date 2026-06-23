import express from "express";
import mongoose from "mongoose";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI ?? "mongodb://localhost:27017/myapp")
  .then(() => console.log("db connected"))
  .catch(console.error);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(3000, () => console.log("server on :3000"));
