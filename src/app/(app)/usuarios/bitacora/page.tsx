import { requirePermission } from "@/lib/auth";
import { AuditView } from "@/features/users/components/audit-view";

export default async function BitacoraPage() {
  await requirePermission("users.manage");
  return <AuditView />;
}
