import { addDays, diffDays, formatMonthYear } from "@/lib/format";
import type { DashboardService } from "../contracts";
import type { DueRow } from "@/features/expenses/types";
import { dueStatus, DUE_SOON_DAYS } from "@/features/expenses/status";
import { lineTotals } from "@/features/payroll/types";
import type { ExpenseComparison, PeriodRef, UpcomingItem } from "@/features/dashboard/types";
import { db } from "./store";
import { DEMO_TODAY } from "./clock";

const rowOf = (due: (typeof db.dues)[number]): DueRow | null => {
  const expense = db.expenses.find((e) => e.id === due.expenseId && !e.deletedAt);
  if (!expense) return null;
  return { due, expense, categoryName: db.categories.find((c) => c.id === expense.categoryId)?.name ?? "—", status: dueStatus(due, DEMO_TODAY), daysToDue: diffDays(DEMO_TODAY, due.dueDate) };
};

const inPeriod = (date: string, mode: "MONTH" | "YEAR", p: PeriodRef) => +date.slice(0, 4) === p.year && (mode === "YEAR" || +date.slice(5, 7) - 1 === p.month);
const label = (mode: "MONTH" | "YEAR", p: PeriodRef) => (mode === "YEAR" ? String(p.year) : formatMonthYear(p.year, p.month));

export const demoDashboardService: DashboardService = {
  async summary() {
    const active = db.employees.filter((e) => e.active).length;
    const lastChange = db.employees.filter((e) => e.statusChangedAt).sort((a, b) => b.statusChangedAt!.localeCompare(a.statusChangedAt!))[0];
    const rows = db.dues.map(rowOf).filter((r): r is DueRow => !!r);
    const horizon = addDays(DEMO_TODAY, DUE_SOON_DAYS);
    const upcoming: UpcomingItem[] = rows
      .filter((r) => !r.due.paidAt && r.due.dueDate >= DEMO_TODAY && r.due.dueDate <= horizon)
      .map((row) => ({ kind: "EXPENSE" as const, row }));
    for (const p of db.payrolls.filter((x) => x.status === "DRAFT")) {
      const date = addDays(p.periodEnd, 1);
      if (date >= DEMO_TODAY && date <= horizon) {
        const lines = db.lines[p.id] ?? [];
        upcoming.push({ kind: "PAYROLL", payrollId: p.id, date, label: `Planilla ${p.periodStart.split("-").reverse().join("/")} – ${p.periodEnd.split("-").reverse().join("/")}`, employeeCount: lines.length, total: lines.reduce((a, l) => a + lineTotals(l.items).net, 0) });
      }
    }
    const dateOf = (u: UpcomingItem) => (u.kind === "EXPENSE" ? u.row.due.dueDate : u.date);
    upcoming.sort((a, b) => dateOf(a).localeCompare(dateOf(b)));
    return {
      activeEmployees: active,
      inactiveEmployees: db.employees.length - active,
      lastStatusChange: lastChange ? { employeeName: `${lastChange.firstName} ${lastChange.lastName1}`, date: lastChange.statusChangedAt! } : undefined,
      upcoming,
      overdue: rows.filter((r) => r.status === "OVERDUE").sort((a, b) => a.due.dueDate.localeCompare(b.due.dueDate)),
    };
  },

  async compareExpenses(mode, a, b) {
    const calc = (p: PeriodRef) => {
      const map = new Map<string, number>();
      for (const d of db.dues) {
        const e = db.expenses.find((x) => x.id === d.expenseId && !x.deletedAt);
        if (!e || !inPeriod(d.dueDate, mode, p)) continue;
        const cat = db.categories.find((c) => c.id === e.categoryId)?.name ?? "—";
        map.set(cat, (map.get(cat) ?? 0) + (d.paidAmount ?? d.estimatedAmount));
      }
      return map;
    };
    const ma = calc(a);
    const mb = calc(b);
    const cats = [...new Set([...ma.keys(), ...mb.keys()])].sort();
    const total = (m: Map<string, number>) => [...m.values()].reduce((x, y) => x + y, 0);
    const res: ExpenseComparison = {
      labelA: label(mode, a), labelB: label(mode, b), totalA: total(ma), totalB: total(mb), difference: total(mb) - total(ma),
      byCategory: cats.map((category) => ({ category, a: ma.get(category) ?? 0, b: mb.get(category) ?? 0 })), emptyA: ma.size === 0, emptyB: mb.size === 0,
    };
    return res;
  },

  async comparePayroll(mode, a, b) {
    // Definición de "costo de planilla" PENDIENTE de confirmar; la demostración usa el salario bruto acumulado.
    const calc = (p: PeriodRef) => {
      const pays = db.payrolls.filter((x) => inPeriod(x.periodStart, mode, p));
      if (!pays.length) return null;
      const lines = pays.flatMap((x) => db.lines[x.id] ?? []);
      return { cost: lines.reduce((acc, l) => acc + lineTotals(l.items).gross, 0), overtimeHours: lines.flatMap((l) => l.items).filter((i) => i.code === "OVERTIME").reduce((acc, i) => acc + (i.quantity ?? 0), 0) };
    };
    return { labelA: label(mode, a), labelB: label(mode, b), a: calc(a), b: calc(b) };
  },

  async availablePeriods() {
    const years = [...new Set([...db.dues.map((d) => +d.dueDate.slice(0, 4)), ...db.payrolls.map((p) => +p.periodStart.slice(0, 4))])].sort();
    return { years };
  },
};
