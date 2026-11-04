import { requirePermission } from "@/lib/auth";
import { SalaryDetailView } from "@/features/employees/components/salary-detail-view";

export default async function DetalleSalarialPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("payroll.view");
  const { id } = await params;
  return <SalaryDetailView employeeId={id} />;
}
