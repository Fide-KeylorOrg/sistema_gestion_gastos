import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export type AuditAction = "login.success" | "login.failure" | "logout" | "logout.idle";

export async function audit(
  action: AuditAction,
  entry: { actorId?: string; entityType?: string; entityId?: string; detail?: Prisma.InputJsonValue; sensitive?: boolean } = {},
): Promise<void> {
  await db.auditLog.create({ data: { action, ...entry } });
}
