import type { ISODate } from "@/lib/format";
import { diffDays } from "@/lib/format";
import type { DueStatus } from "./types";

/** Ventana de "próximos vencimientos". Misma regla en calendario y dashboard (HU-45, HU-50). */
export const DUE_SOON_DAYS = 7;

/** Estado derivado (HU-43): pagado si tiene un pago vigente; vencido si la fecha ya pasó; si no, pendiente. */
export function dueStatus(dueDate: ISODate, hasActivePayment: boolean, today: ISODate): DueStatus {
  if (hasActivePayment) return "PAID";
  return dueDate < today ? "OVERDUE" : "PENDING";
}

export const isDueSoon = (dueDate: ISODate, today: ISODate) => {
  const d = diffDays(today, dueDate);
  return d >= 0 && d <= DUE_SOON_DAYS;
};
