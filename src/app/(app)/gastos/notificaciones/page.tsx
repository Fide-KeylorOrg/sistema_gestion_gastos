import { requirePermission } from "@/lib/auth";
import { NotificationSettingsView } from "@/features/expenses/components/notification-settings-view";

export default async function NotificacionesPage() {
  await requirePermission("expenses.view");
  return <NotificationSettingsView />;
}
