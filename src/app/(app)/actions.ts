"use server";

import { getCurrentUser } from "@/lib/auth";

/** Called by the idle timer while the user is active, so typing in a long form keeps the session alive. */
export async function keepAlive(): Promise<boolean> {
  return (await getCurrentUser()) !== null;
}
