import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Permission } from "@/lib/permissions";
import { createSession, deleteSession, validateSession, type CurrentUser } from "@/lib/sessions";

export const SESSION_COOKIE = "session";

// Deduplicated per request. Not `use cache: private`: that would keep serving a user for minutes after deactivation.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? validateSession(token) : null;
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Call at the top of every page and Server Action that touches protected data; hiding a link is not enough. */
export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.permissions.includes(permission)) redirect("/sin-permiso");
  return user;
}

export async function startSession(userId: string): Promise<void> {
  const token = await createSession(userId);
  // No maxAge: the cookie dies with the browser; the server-side expiry enforces inactivity.
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  store.delete(SESSION_COOKIE);
}
