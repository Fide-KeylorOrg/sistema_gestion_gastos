import { requirePermission } from "@/lib/auth";
import { PayrollListView } from "@/features/payroll/components/payroll-list-view";

export default async function PlanillaPage() {
  await requirePermission("payroll.view");
  return <PayrollListView />;
}
