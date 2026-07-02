import type { Express } from "express";
import type { MongoClient } from "mongodb";

import { registerAuthRoutes } from "./routes/auth";
import { registerGameRoutes } from "./routes/game";
import { registerThemeRoutes } from "./routes/theme";
import { registerVersusRoutes } from "./routes/versus";
import { registerAccountRoutes } from "./routes/account";

export function setApp(app: Express, client: MongoClient) {
  const db = client.db();

  registerAuthRoutes(app, db);
  registerGameRoutes(app, db);
  registerThemeRoutes(app, db);
  registerVersusRoutes(app, db);
  registerAccountRoutes(app, db);
}
