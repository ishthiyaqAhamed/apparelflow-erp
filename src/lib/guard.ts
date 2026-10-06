import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { getSession, type SessionUser } from "@/lib/session";

type GuardResult =
  | { ok: true; session: SessionUser }
  | { ok: false; response: NextResponse };

export async function requireRole(...allowed: Role[]): Promise<GuardResult> {
  const session = await getSession();

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      ),
    };
  }

  if (!allowed.includes(session.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden: your role cannot perform this action" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, session };
}