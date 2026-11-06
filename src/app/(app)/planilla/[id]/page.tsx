import { requirePermission } from "@/lib/auth";
import { PayrollDetailView } from "@/features/payroll/components/payroll-detail-view";

export default async function PlanillaPeriodoPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("payroll.view");
  const { id } = await params;
  return <PayrollDetailView payrollId={id} />;
}
