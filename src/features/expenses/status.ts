import type { ISODate } from "@/lib/format";
import { diffDays } from "@/lib/format";
import type { DueStatus, ExpenseDue } from "./types";

/** Ventana de "próximos vencimientos". Misma regla en calendario y dashboard (HU-60). */
export const DUE_SOON_DAYS = 7;

/** Estado derivado (HU-52): pagado si tiene fecha de pago; vencido si la fecha ya pasó; si no, pendiente. */
export function dueStatus(due: Pick<ExpenseDue, "dueDate" | "paidAt">, today: ISODate): DueStatus {
  if (due.paidAt) return "PAID";
  return due.dueDate < today ? "OVERDUE" : "PENDING";
}

export const isDueSoon = (dueDate: ISODate, today: ISODate) => {
  const d = diffDays(today, dueDate);
  return d >= 0 && d <= DUE_SOON_DAYS;
};
