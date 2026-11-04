import { requirePermission } from "@/lib/auth";
import { ExpenseDetailView } from "@/features/expenses/components/expense-detail-view";

export default async function GastoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("expenses.view");
  const { id } = await params;
  return <ExpenseDetailView dueId={id} />;
}
