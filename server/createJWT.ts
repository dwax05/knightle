import jwt from "jsonwebtoken";

export function createToken(fn: string, ln: string, id: number) {
  try {
    const user = { userId: id, firstName: fn, lastName: ln };
    const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET as string);
    // for expiry: jwt.sign(user, secret, { expiresIn: "30m" })
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
