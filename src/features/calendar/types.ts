import type { ISODate } from "@/lib/format";

export type CalendarEventType = "PLANILLA" | "VACACIONES" | "INCAPACIDAD" | "CONTRATO" | "FERIADO" | "PAGO" | "PERMISO";

export const EVENT_TYPE_LABEL: Record<CalendarEventType, string> = {
  PLANILLA: "Planilla",
  VACACIONES: "Vacaciones",
  INCAPACIDAD: "Incapacidad",
  CONTRATO: "Contrato",
  FERIADO: "Feriado",
  PAGO: "Pago recurrente",
  PERMISO: "Permiso",
};

/** Color e ícono por tipo: se muestra el nombre además del color (accesibilidad, HU-56). */
export const EVENT_TYPE_STYLE: Record<CalendarEventType, { chip: string; dot: string; icon: string }> = {
  PLANILLA: { chip: "bg-blue-100 text-blue-800 border-blue-200", dot: "bg-blue-600", icon: "payments" },
  VACACIONES: { chip: "bg-teal-100 text-teal-800 border-teal-200", dot: "bg-teal-600", icon: "beach_access" },
  INCAPACIDAD: { chip: "bg-purple-100 text-purple-800 border-purple-200", dot: "bg-purple-600", icon: "medical_services" },
  CONTRATO: { chip: "bg-indigo-100 text-indigo-800 border-indigo-200", dot: "bg-indigo-600", icon: "contract" },
  FERIADO: { chip: "bg-slate-200 text-slate-800 border-slate-300", dot: "bg-slate-500", icon: "celebration" },
  PAGO: { chip: "bg-amber-100 text-amber-800 border-amber-200", dot: "bg-amber-600", icon: "receipt_long" },
  PERMISO: { chip: "bg-rose-100 text-rose-800 border-rose-200", dot: "bg-rose-600", icon: "verified" },
};

export type CalendarEvent = {
  id: string;
  date: ISODate;
  type: CalendarEventType;
  title: string;
  /** Colaborador, categoría u otra referencia. */
  subtitle?: string;
  /** Datos del detalle (HU-57). Los montos salariales llegan en `salaryDetail` y solo se muestran con permiso. */
  detail: { label: string; value: string }[];
  salaryDetail?: { label: string; value: string }[];
  /** Estado de pago de obligaciones (HU-60). */
  dueStatus?: "PENDING" | "OVERDUE" | "PAID";
  dueSoon?: boolean;
  workedHoliday?: { employeeName: string; payrollLabel: string }[];
  href?: string;
};
