import { Badge } from "@/components/ui/badge";
import { DUE_STATUS_LABEL, type DueRow } from "../types";
import { DUE_SOON_DAYS } from "../status";

/** Misma presentación en gastos, calendario y dashboard (HU-52, HU-60). */
export function DueStatusBadge({ row }: { row: Pick<DueRow, "status" | "daysToDue"> }) {
  const soon = row.status === "PENDING" && row.daysToDue >= 0 && row.daysToDue <= DUE_SOON_DAYS;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge tone={row.status === "PAID" ? "success" : row.status === "OVERDUE" ? "danger" : "warning"}>{DUE_STATUS_LABEL[row.status]}</Badge>
      {soon && <Badge tone="info">Próximo a vencer</Badge>}
    </span>
  );
}
