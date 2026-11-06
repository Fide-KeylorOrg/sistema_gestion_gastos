import { requirePermission } from "@/lib/auth";
import { ExpensesListView } from "@/features/expenses/components/expenses-list-view";

export default async function GastosPage() {
  await requirePermission("expenses.view");
  return <ExpensesListView />;
}
