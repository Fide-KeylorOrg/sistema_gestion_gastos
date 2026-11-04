import { requirePermission } from "@/lib/auth";
import { EmployeeFormView } from "@/features/employees/components/employee-form-view";

export default async function EditarEmpleadoPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("payroll.edit");
  const { id } = await params;
  return <EmployeeFormView employeeId={id} />;
}
