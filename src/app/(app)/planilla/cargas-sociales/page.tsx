import { requirePermission } from "@/lib/auth";
import { RatesView } from "@/features/payroll/components/rates-view";

export default async function CargasSocialesPage() {
  await requirePermission("payroll.view");
  return <RatesView />;
}
