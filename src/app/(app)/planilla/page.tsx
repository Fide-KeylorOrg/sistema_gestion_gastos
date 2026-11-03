import { requirePermission } from "@/lib/auth";

export default async function PlanillaPage() {
  await requirePermission("payroll.view");
  return <h1>Planilla</h1>;
}
