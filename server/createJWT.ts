import jwt from "jsonwebtoken";

export function createToken(login: string, id: number) {
  const user = { userId: id, login };
  const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: "15m" });
  return { accessToken };
}

export function createRefreshToken(login: string, id: number) {
  return jwt.sign({ userId: id, login }, process.env.REFRESH_TOKEN_SECRET as string, { expiresIn: "30d" });
}

export function verifyRefreshToken(token: string): { userId: number; login: string } | null {
  try {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET as string) as any;
  } catch {
    return null;
  }
}
