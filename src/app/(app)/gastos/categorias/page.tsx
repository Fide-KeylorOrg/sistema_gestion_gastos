import { requirePermission } from "@/lib/auth";
import { CategoriesView } from "@/features/expenses/components/categories-view";

export default async function CategoriasPage() {
  await requirePermission("expenses.view");
  return <CategoriesView />;
}
