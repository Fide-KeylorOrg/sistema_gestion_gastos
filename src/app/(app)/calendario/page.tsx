import { requirePermission } from "@/lib/auth";

export default async function CalendarioPage() {
  await requirePermission("calendar.view");
  return <h1>Calendario</h1>;
}
