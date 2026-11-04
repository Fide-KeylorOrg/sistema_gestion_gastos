import { addDays, formatCRC, formatDate, toISO } from "@/lib/format";
import type { CalendarService } from "../contracts";
import type { CalendarEvent } from "@/features/calendar/types";
import { DISABILITY_TYPE_LABEL, fullName } from "@/features/employees/types";
import { dueStatus, isDueSoon } from "@/features/expenses/status";
import { lineTotals } from "@/features/payroll/types";
import { db, payrollLabel } from "./store";
import { DEMO_TODAY } from "./clock";

const eachDay = (start: string, end: string) => {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
};

/** Eventos derivados de los demás módulos (planilla, empleados, gastos). El backend debe entregar la misma forma. */
export const demoCalendarService: CalendarService = {
  async month(year, m0) {
    const first = toISO(year, m0, 1);
    const last = toISO(year, m0, new Date(Date.UTC(year, m0 + 1, 0)).getUTCDate());
    const inMonth = (d: string) => d >= first && d <= last;
    const events: CalendarEvent[] = [];

    for (const p of db.payrolls) {
      const date = p.paidAt ?? addDays(p.periodEnd, 1);
      if (!inMonth(date)) continue;
      const lines = db.lines[p.id] ?? [];
      const net = lines.reduce((a, l) => a + lineTotals(l.items).net, 0);
      events.push({
        id: `pl-${p.id}`, date, type: "PLANILLA", title: `Planilla ${payrollLabel(p)}`, subtitle: p.status === "CLOSED" ? "Cerrada" : "Borrador",
        detail: [{ label: "Período", value: payrollLabel(p) }, { label: "Estado", value: p.status === "CLOSED" ? "Cerrada" : "Borrador" }, { label: "Colaboradores", value: String(lines.length) }],
        salaryDetail: [{ label: "Total neto (ejemplo)", value: formatCRC(net) }], href: `/planilla/${p.id}`,
      });
    }

    for (const v of db.vacations.filter((x) => !x.cancelled)) {
      const e = db.employees.find((x) => x.id === v.employeeId)!;
      for (const d of eachDay(v.start, v.end).filter(inMonth))
        events.push({ id: `vac-${v.id}-${d}`, date: d, type: "VACACIONES", title: `Vacaciones: ${fullName(e)}`, subtitle: e.position, detail: [{ label: "Colaborador", value: fullName(e) }, { label: "Del", value: formatDate(v.start) }, { label: "Al", value: formatDate(v.end) }, { label: "Días", value: String(v.days) }], href: `/empleados/${e.id}` });
    }
    for (const v of db.disabilities.filter((x) => !x.cancelled)) {
      const e = db.employees.find((x) => x.id === v.employeeId)!;
      for (const d of eachDay(v.start, v.end).filter(inMonth))
        events.push({ id: `inc-${v.id}-${d}`, date: d, type: "INCAPACIDAD", title: `Incapacidad: ${fullName(e)}`, subtitle: DISABILITY_TYPE_LABEL[v.type], detail: [{ label: "Colaborador", value: fullName(e) }, { label: "Tipo", value: DISABILITY_TYPE_LABEL[v.type] }, { label: "Del", value: formatDate(v.start) }, { label: "Al", value: formatDate(v.end) }], href: `/empleados/${e.id}` });
    }
    for (const e of db.employees.filter((x) => x.contractEndsOn && inMonth(x.contractEndsOn)))
      events.push({ id: `con-${e.id}`, date: e.contractEndsOn!, type: "CONTRATO", title: `Vence contrato: ${fullName(e)}`, subtitle: e.position, detail: [{ label: "Colaborador", value: fullName(e) }, { label: "Puesto", value: e.position }, { label: "Vencimiento", value: formatDate(e.contractEndsOn) }], href: `/empleados/${e.id}` });

    for (const h of db.holidays.filter((x) => inMonth(x.date))) {
      const worked = db.novelties.filter((n) => !n.cancelled && n.type === "FERIADO_TRABAJADO" && n.date === h.date).map((n) => ({ employeeName: n.employeeName, payrollLabel: payrollLabel(db.payrolls.find((p) => p.id === n.payrollId)!) }));
      events.push({ id: `fer-${h.date}`, date: h.date, type: "FERIADO", title: h.name, subtitle: worked.length ? `Feriado trabajado (${worked.length})` : "Feriado", detail: [{ label: "Feriado", value: h.name }, { label: "Fecha", value: formatDate(h.date) }], workedHoliday: worked, href: worked.length ? "/planilla/novedades" : undefined });
    }

    for (const due of db.dues.filter((d) => inMonth(d.dueDate))) {
      const e = db.expenses.find((x) => x.id === due.expenseId && !x.deletedAt);
      if (!e) continue;
      const status = dueStatus(due, DEMO_TODAY);
      const cat = db.categories.find((c) => c.id === e.categoryId)?.name ?? "—";
      events.push({
        id: `due-${due.id}`, date: due.dueDate, type: e.kind === "PERMIT" ? "PERMISO" : "PAGO", title: e.concept, subtitle: cat, dueStatus: status, dueSoon: status === "PENDING" && isDueSoon(due.dueDate, DEMO_TODAY),
        detail: [
          { label: "Concepto", value: e.concept }, { label: "Categoría", value: cat }, { label: "Monto", value: formatCRC(due.paidAmount ?? due.estimatedAmount) },
          { label: "Vencimiento", value: formatDate(due.dueDate) }, { label: "Estado del pago", value: status === "PAID" ? `Pagado el ${formatDate(due.paidAt)}` : status === "OVERDUE" ? "Vencido" : "Pendiente" },
        ],
        href: `/gastos/${due.id}`,
      });
    }
    return events.sort((a, b) => a.date.localeCompare(b.date));
  },
};
