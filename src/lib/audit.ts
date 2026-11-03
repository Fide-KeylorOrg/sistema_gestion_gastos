import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export type AuditAction = "login.success" | "login.failure" | "logout" | "logout.idle";

export async function audit(
  action: AuditAction,
  entry: { actorId?: string; target?: string; detail?: Prisma.InputJsonValue } = {},
): Promise<void> {
  await db.auditLog.create({ data: { action, ...entry } });
}
