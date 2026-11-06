import { requirePermission } from "@/lib/auth";
import { EmployeeRecordView } from "@/features/employees/components/employee-record-view";

export default async function ExpedientePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("payroll.view");
  const { id } = await params;
  return <EmployeeRecordView id={id} />;
}
