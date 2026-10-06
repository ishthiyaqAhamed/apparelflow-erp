import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

const COOKIE_NAME = "session";

const secret = process.env.AUTH_SECRET;
if (!secret) {
  throw new Error("AUTH_SECRET is not set");
}
const key = new TextEncoder().encode(secret);

export type SessionUser = {
  userId: number;
  role: Role;
  fullName: string;
};

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ role: user.role, fullName: user.fullName })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.userId))
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(key);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, key);
    return {
      userId: Number(payload.sub),
      role: payload.role as Role,
      fullName: payload.fullName as string,
    };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}