import type { ISODate } from "@/lib/format";
import type { DueRow } from "@/features/expenses/types";

export type UpcomingItem =
  | { kind: "EXPENSE"; row: DueRow }
  | { kind: "PAYROLL"; payrollId: string; date: ISODate; label: string; employeeCount: number; total: number | null };

export type DashboardSummary = {
  activeEmployees: number;
  inactiveEmployees: number;
  lastStatusChange?: { employeeName: string; date: ISODate };
  /** Próximos 7 días, de la fecha más cercana a la más lejana (HU-62). */
  upcoming: UpcomingItem[];
  /** Vencidos, separados de los próximos (HU-63). */
  overdue: DueRow[];
};

export type ComparisonMode = "MONTH" | "YEAR";
export type PeriodRef = { year: number; month: number }; // month 0-11 (ignorado en modo YEAR)

export type ExpenseComparison = {
  labelA: string;
  labelB: string;
  totalA: number;
  totalB: number;
  difference: number;
  byCategory: { category: string; a: number; b: number }[];
  /** Un período sin gastos se muestra en cero (HU-64 escenario 3). */
  emptyA: boolean;
  emptyB: boolean;
};

export type PayrollComparison = {
  labelA: string;
  labelB: string;
  a: { cost: number; overtimeHours: number } | null;
  b: { cost: number; overtimeHours: number } | null;
};
