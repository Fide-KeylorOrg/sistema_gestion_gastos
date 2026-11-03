import { requirePermission } from "@/lib/auth";

export default async function DashboardPage() {
  await requirePermission("dashboard.view");
  return <h1>Dashboard</h1>;
}
