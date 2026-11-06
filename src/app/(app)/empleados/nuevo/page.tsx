import { requirePermission } from "@/lib/auth";
import { EmployeeFormView } from "@/features/employees/components/employee-form-view";

export default async function NuevoEmpleadoPage() {
  await requirePermission("payroll.edit");
  return <EmployeeFormView />;
}
