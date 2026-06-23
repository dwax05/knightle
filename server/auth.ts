import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthedRequest extends Request {
  user?: { userId: number; firstName: string; lastName: string };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string);
    req.user = payload as AuthedRequest["user"];
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
