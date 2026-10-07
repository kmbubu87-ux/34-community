import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "../../db/client";
import { sessions, users } from "../../db/schema";
import { newSessionToken, sessionTokenHash } from "./crypto";
import { reportAccess } from "../pastoral/access";
import { isApprovedOfficer } from "./officer";

export const SESSION_COOKIE_NAME = "prayer_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
const SESSION_ROLL_AFTER_MS = 60 * 60 * 24 * 1000;

export type SessionUser = {
  id: string;
  displayName: string;
  samId: string | null;
  role: "member" | "admin";
};

export function sessionCookieOptions(nodeEnv: string | undefined = process.env.NODE_ENV) {
  return {
    httpOnly: true,
    secure: nodeEnv === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function sessionExpiry(now = new Date()): Date {
  return new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);
}

export function shouldRollSession(lastSeenAt: Date, now = new Date()): boolean {
  return now.getTime() - lastSeenAt.getTime() >= SESSION_ROLL_AFTER_MS;
}

export async function createSession(userId: string, now = new Date()) {
  const token = newSessionToken();
  const expiresAt = sessionExpiry(now);
  await getDb().insert(sessions).values({
    userId,
    tokenHash: sessionTokenHash(token),
    expiresAt,
    lastSeenAt: now,
  });
  return { token, expiresAt };
}

export async function getSessionUser(token: string, now = new Date()): Promise<SessionUser | null> {
  if (!token) return null;
  const [row] = await getDb()
    .select({
      id: users.id,
      displayName: users.displayName,
      samId: users.samId,
      role: users.role,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, sessionTokenHash(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now),
        eq(users.isActive, true),
      ),
    )
    .limit(1);

  if (!row) return null;
  if (row.role !== "admin" && !(await isApprovedOfficer(row.id)) && !(await reportAccess({ id: row.id, displayName: row.displayName, role: row.role })).visible) return null;
  return row;
}

export async function refreshSession(token: string, now = new Date()): Promise<boolean> {
  if (!token) return false;
  const hash = sessionTokenHash(token);
  const [row] = await getDb()
    .select({ id: sessions.id, lastSeenAt: sessions.lastSeenAt })
    .from(sessions)
    .where(
      and(
        eq(sessions.tokenHash, hash),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now),
      ),
    )
    .limit(1);

  if (!row || !shouldRollSession(row.lastSeenAt, now)) return false;

  await getDb()
    .update(sessions)
    .set({ lastSeenAt: now, expiresAt: sessionExpiry(now) })
    .where(eq(sessions.id, row.id));

  return true;
}

export async function revokeSession(token: string, now = new Date()): Promise<void> {
  if (!token) return;
  await getDb()
    .update(sessions)
    .set({ revokedAt: now })
    .where(and(eq(sessions.tokenHash, sessionTokenHash(token)), isNull(sessions.revokedAt)));
}

export async function revokeAllSessionsForUser(userId: string, now = new Date()): Promise<void> {
  await getDb()
    .update(sessions)
    .set({ revokedAt: now })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}
