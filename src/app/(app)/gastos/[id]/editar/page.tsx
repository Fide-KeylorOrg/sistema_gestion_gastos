import { requirePermission } from "@/lib/auth";
import { ExpenseFormView } from "@/features/expenses/components/expense-form-view";

// El id de la ruta /gastos/[id]/editar es el del GASTO (Expense), no el del vencimiento.
export default async function EditarGastoPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("expenses.edit");
  const { id } = await params;
  return <ExpenseFormView expenseId={id} />;
}
