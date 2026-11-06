import type { ISODate } from "@/lib/format";

export type PayrollStatus = "DRAFT" | "CLOSED";
export const PAYROLL_STATUS_LABEL: Record<PayrollStatus, string> = { DRAFT: "Borrador", CLOSED: "Cerrada" };

export type PayrollItemKind = "EARNING" | "DEDUCTION" | "EMPLOYER_CONTRIBUTION";
export const ITEM_KIND_LABEL: Record<PayrollItemKind, string> = { EARNING: "Ingresos", DEDUCTION: "Deducciones", EMPLOYER_CONTRIBUTION: "Cargas patronales" };

/** Igual que PayrollItem de Prisma. Los montos los calcula el servidor. */
export type PayrollItem = {
  id: string;
  kind: PayrollItemKind;
  /** Ej.: ORDINARY, OVERTIME, HOLIDAY, UNPAID_LEAVE, ADVANCE, CCSS_EMPLOYEE (códigos por definir con las reglas de cálculo). */
  code: string;
  description: string;
  quantity?: number;
  amount: number;
};

export type PayrollLine = {
  employeeId: string;
  employeeName: string;
  idNumber: string;
  position: string;
  items: PayrollItem[];
  /** Hay novedades guardadas que el servidor aún no recalcula (ver ServerPending). */
  recalcPending: boolean;
};

export type LineTotals = { gross: number; deductions: number; net: number; employer: number };
/** Bruto, deducciones y neto son sumas por tipo (nunca se guardan, ver schema.prisma). */
export function lineTotals(items: PayrollItem[]): LineTotals {
  const sum = (k: PayrollItemKind) => items.filter((i) => i.kind === k).reduce((a, i) => a + i.amount, 0);
  const gross = sum("EARNING");
  const deductions = sum("DEDUCTION");
  return { gross, deductions, net: gross - deductions, employer: sum("EMPLOYER_CONTRIBUTION") };
}

export type Payroll = {
  id: string;
  periodStart: ISODate;
  periodEnd: ISODate;
  status: PayrollStatus;
  closedAt?: string;
  paidAt?: ISODate;
};
export type PayrollSummary = Payroll & { employeeCount: number; totals: LineTotals; recalcPending: boolean };
export type PayrollDetail = { payroll: Payroll; lines: PayrollLine[]; totals: LineTotals; employerItems: { code: string; description: string; amount: number }[]; recalcPending: boolean };

export type PayrollFilters = { from?: ISODate; to?: ISODate; status?: PayrollStatus | "" };
export type CreatePayrollInput = { periodStart: ISODate; periodEnd: ISODate };

export type NoveltyType = "HORAS_EXTRA" | "FERIADO_TRABAJADO" | "PERMISO_SIN_GOCE" | "AUSENCIA";
export const NOVELTY_TYPE_LABEL: Record<NoveltyType, string> = {
  HORAS_EXTRA: "Horas extra",
  FERIADO_TRABAJADO: "Feriado trabajado",
  PERMISO_SIN_GOCE: "Permiso sin goce",
  AUSENCIA: "Ausencia",
};
export const NOVELTY_UNIT: Record<NoveltyType, "horas" | "días"> = { HORAS_EXTRA: "horas", FERIADO_TRABAJADO: "días", PERMISO_SIN_GOCE: "días", AUSENCIA: "días" };
/** Rango máximo por registro (HU-19 escenario 2, "fuera de rango"). PENDIENTE: confirmar límites con la administración. */
export const NOVELTY_MAX: Record<"horas" | "días", number> = { horas: 24, días: 31 };

export type Novelty = {
  id: string;
  payrollId: string;
  employeeId: string;
  employeeName: string;
  date: ISODate;
  type: NoveltyType;
  quantity: number;
  note?: string;
  cancelled: boolean;
};
export type NoveltyInput = { payrollId: string; employeeId: string; date: ISODate; type: NoveltyType | ""; quantity: number | null; note?: string };
export type NoveltyFilters = { payrollId?: string; employeeId?: string };

export type EmployeePayrollHistoryItem = { payrollId: string; periodStart: ISODate; periodEnd: ISODate; status: PayrollStatus; items: PayrollItem[] };
export type EmployeeSalaryView = {
  employeeId: string;
  salaryBasis: string;
  baseSalary: number;
  workday: string;
  vacationBalanceDays: number;
  overtimeHours: number;
  deductions: { description: string; amount: number }[];
  /** Provisiones: las calcula el backend (reglas pendientes). */
  provisions: { aguinaldo: number | null; liquidation: number | null };
  periodLabel: string;
  movements: EmployeePayrollHistoryItem[];
};

export type RateScope = "OBRERO" | "PATRONAL";
export type RateValueType = "PERCENT" | "FIXED" | "RANGES";
/** Parámetro global de cargas sociales y retenciones (HU-22). Valores de ejemplo, no oficiales. */
export type GlobalRate = {
  id: string;
  concept: string;
  institution: string;
  scope: RateScope;
  valueType: RateValueType;
  value: number | null;
  ranges?: { from: number; to: number | null; percent: number }[];
  effectiveFrom: ISODate;
  /** Si es true no se puede modificar y se muestra el motivo (HU-22 escenario 3). */
  locked: boolean;
  lockReason?: string;
};
export type RateInput = { value: number | null; effectiveFrom: ISODate; /** Solo para rangos: nuevo porcentaje de cada tramo, en el mismo orden. */ rangePercents?: number[] };

export type ExitReason = "RENUNCIA" | "DESPIDO_CON_RESPONSABILIDAD" | "DESPIDO_SIN_RESPONSABILIDAD" | "MUTUO_ACUERDO";
export const EXIT_REASON_LABEL: Record<ExitReason, string> = {
  RENUNCIA: "Renuncia",
  DESPIDO_CON_RESPONSABILIDAD: "Despido con responsabilidad patronal",
  DESPIDO_SIN_RESPONSABILIDAD: "Despido sin responsabilidad patronal",
  MUTUO_ACUERDO: "Mutuo acuerdo",
};
export type LiquidationInput = { employeeId: string; exitDate: ISODate; exitReason: ExitReason | "" };
export type LiquidationResult =
  | { status: "MISSING_DATA"; missing: string[] }
  | {
      status: "ILLUSTRATIVE";
      usedData: { label: string; value: string }[];
      concepts: { concept: string; basis: string; days: number | null; amount: number }[];
      total: number;
    };

/** Estado de la generación del archivo CCSS (HU-24). */
export type CcssCheck = { ok: true } | { ok: false; reason: "NOT_CLOSED" | "MISSING_DATA"; missing?: { employee: string; field: string }[] };

export type Payslip = { payrollId: string; periodStart: ISODate; periodEnd: ISODate; employeeName: string; idNumber: string; position: string; items: PayrollItem[]; totals: LineTotals };
