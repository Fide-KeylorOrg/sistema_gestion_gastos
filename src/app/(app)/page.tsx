import { requirePermission } from "@/lib/auth";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";

export default async function DashboardPage() {
  await requirePermission("dashboard.view");
  return <DashboardView />;
}
