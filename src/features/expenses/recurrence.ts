import { addDays, toISO, type ISODate } from "@/lib/format";
import type { Recurrence } from "./types";

const MONTHS_STEP: Partial<Record<Recurrence, number>> = { MONTHLY: 1, BIMONTHLY: 2, QUARTERLY: 3, SEMIANNUAL: 6, YEARLY: 12 };

/**
 * Siguiente fecha de vencimiento según la frecuencia (HU-40, HU-44). Aritmética de calendario simple;
 * el backend debe aplicar la misma regla (p. ej. día 31 → último día del mes más corto).
 */
export function nextDueDate(from: ISODate, recurrence: Recurrence): ISODate | null {
  if (recurrence === "NONE") return null;
  if (recurrence === "WEEKLY") return addDays(from, 7);
  if (recurrence === "BIWEEKLY") return addDays(from, 14);
  const step = MONTHS_STEP[recurrence]!;
  const [y, m, d] = from.split("-").map(Number);
  const total = m - 1 + step;
  const year = y + Math.floor(total / 12);
  const month0 = total % 12;
  const lastDay = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  return toISO(year, month0, Math.min(d, lastDay));
}
