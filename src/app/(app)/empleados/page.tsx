import { requirePermission } from "@/lib/auth";
import { EmployeesListView } from "@/features/employees/components/employees-list-view";

export default async function EmpleadosPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  await requirePermission("payroll.view");
  const { estado } = await searchParams;
  // El dashboard enlaza aquí con ?estado=activo|inactivo (HU-66 escenario 2).
  const initialActive = estado === "activo" ? "active" : estado === "inactivo" ? "inactive" : "all";
  return <EmployeesListView initialActive={initialActive} />;
}
