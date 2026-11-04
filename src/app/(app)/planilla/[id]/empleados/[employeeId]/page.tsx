import { requirePermission } from "@/lib/auth";
import { PayrollEmployeeView } from "@/features/payroll/components/payroll-employee-view";

export default async function DesgloseEmpleadoPage({ params }: { params: Promise<{ id: string; employeeId: string }> }) {
  await requirePermission("payroll.view");
  const { id, employeeId } = await params;
  return <PayrollEmployeeView payrollId={id} employeeId={employeeId} />;
}
