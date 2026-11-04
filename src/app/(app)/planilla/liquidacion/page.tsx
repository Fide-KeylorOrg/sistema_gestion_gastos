import { requirePermission } from "@/lib/auth";
import { LiquidationView } from "@/features/payroll/components/liquidation-view";

export default async function LiquidacionPage() {
  await requirePermission("payroll.view");
  return <LiquidationView />;
}
