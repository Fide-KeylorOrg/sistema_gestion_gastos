import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type { Permission } from "@/lib/permissions";

/** Inactivity limit (RQNF-007). Every request within it pushes the expiry forward. */
export const SESSION_TTL_MS = 10 * 60 * 1000;
// Writes the new expiry at most once a minute instead of on every request.
const REFRESH_AFTER_MS = 60 * 1000;

export type CurrentUser = {
  id: string;
  fullName: string;
  username: string;
  mustChangePassword: boolean;
  permissions: Permission[];
};

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Creates a session and returns the raw token for the cookie; only its hash is stored. */
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  await db.$transaction([
    db.session.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }),
    db.session.create({ data: { id: hashToken(token), userId, expiresAt: new Date(now + SESSION_TTL_MS) } }),
  ]);
  return token;
}

/** Returns the session's user, or null if the session is unknown, expired, or the user is inactive. */
export async function validateSession(token: string): Promise<CurrentUser | null> {
  const id = hashToken(token);
  const session = await db.session.findUnique({ where: { id }, include: { user: { include: { role: true } } } });
  if (!session) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() <= now || !session.user.active) {
    await db.session.deleteMany({ where: { id } });
    return null;
  }
  if (session.expiresAt.getTime() - now < SESSION_TTL_MS - REFRESH_AFTER_MS) {
    await db.session.update({ where: { id }, data: { expiresAt: new Date(now + SESSION_TTL_MS) } });
  }

  const { user } = session;
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    mustChangePassword: user.mustChangePassword,
    permissions: user.role.permissions as Permission[],
  };
}

export async function deleteSession(token: string): Promise<void> {
  await db.session.deleteMany({ where: { id: hashToken(token) } });
}
