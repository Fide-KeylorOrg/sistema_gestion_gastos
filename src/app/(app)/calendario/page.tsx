import { requirePermission } from "@/lib/auth";
import { CalendarView } from "@/features/calendar/components/calendar-view";

export default async function CalendarioPage() {
  await requirePermission("calendar.view");
  return <CalendarView />;
}
