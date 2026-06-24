import jwt from "jsonwebtoken";

export function createToken(login: string, id: number) {
  try {
    const user = { userId: id, login };
    const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: "1h" });
    return { accessToken };
  } catch (e: any) {
    return { error: e.message };
  }
}

export function isExpired(token: string): boolean {
  let expired = false;
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string, (err) => {
    expired = !!err;
  });
  return expired;
}
