import { requirePermission } from "@/lib/auth";
import { NoveltiesView } from "@/features/payroll/components/novelties-view";

export default async function NovedadesPage() {
  await requirePermission("payroll.view");
  return <NoveltiesView />;
}
