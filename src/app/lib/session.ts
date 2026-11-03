import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
 
const secret = new TextEncoder()
  .encode(process.env.JWT_SECRET);
export const COOKIE_NAME = "session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 jours
 
export async function createSession(userId: number) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
 
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}
export async function getSession():
  Promise<{ userId: number } | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return { userId: payload.userId as number };
  } catch {
    return null; // token invalide ou expiré
  }
}
 
export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
