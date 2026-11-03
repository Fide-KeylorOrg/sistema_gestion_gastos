import { requirePermission } from "@/lib/auth";

export default async function GastosPage() {
  await requirePermission("expenses.view");
  return <h1>Gastos</h1>;
}
