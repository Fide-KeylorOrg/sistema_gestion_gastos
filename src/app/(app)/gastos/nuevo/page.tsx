import { requirePermission } from "@/lib/auth";
import { ExpenseFormView } from "@/features/expenses/components/expense-form-view";

export default async function NuevoGastoPage() {
  await requirePermission("expenses.edit");
  return <ExpenseFormView />;
}
