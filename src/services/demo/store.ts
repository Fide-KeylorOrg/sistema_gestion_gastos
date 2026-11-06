/**
 * ALMACÉN EN MEMORIA de la demostración. Vive en el navegador: se reinicia al recargar y NO se persiste.
 * Reemplazar por el backend no requiere tocar este archivo: se borra junto con `services/demo/`.
 */
import { notifyDataChanged } from "../invalidation";
import type { AuditAction, AuditEntry, Role, User, UserChange } from "@/features/users/types";
import type { Expense, ExpenseCategory, ExpenseDue, ExpenseHistoryEntry, NotificationSettings } from "@/features/expenses/types";
import type { DisabilityRecord, Employee, EmployeeDocument, SalaryAdvance, VacationRecord, WorkHistoryEntry } from "@/features/employees/types";
import type { GlobalRate, Novelty, Payroll, PayrollLine } from "@/features/payroll/types";
import { demoAudit, demoRoles, demoUserChanges, demoUsers } from "./data/users";
import { demoCategories, demoDues, demoExpenseHistory, demoExpenses } from "./data/expenses";
import { demoAdvances, demoDisabilities, demoDocuments, demoEmployees, demoVacations, demoWorkHistory } from "./data/employees";
import { buildDemoLines, demoHolidays, demoNovelties, demoPayrolls, demoRates } from "./data/payroll";
import { DEMO_ACTOR } from "./clock";

type State = {
  roles: Role[];
  users: User[];
  userChanges: UserChange[];
  audit: AuditEntry[];
  categories: ExpenseCategory[];
  expenses: Expense[];
  dues: ExpenseDue[];
  expenseHistory: ExpenseHistoryEntry[];
  notification: NotificationSettings;
  employees: Employee[];
  workHistory: WorkHistoryEntry[];
  vacations: VacationRecord[];
  disabilities: DisabilityRecord[];
  documents: EmployeeDocument[];
  advances: SalaryAdvance[];
  payrolls: Payroll[];
  lines: Record<string, PayrollLine[]>;
  novelties: Novelty[];
  rates: GlobalRate[];
  holidays: { date: string; name: string }[];
  /** Contraseña actual de la sesión de demostración (HU-13): no existe verificación real. */
  demoPassword: string;
};

function seed(): State {
  const employees = demoEmployees();
  const payrolls = demoPayrolls();
  const lines: Record<string, PayrollLine[]> = {};
  for (const p of payrolls) lines[p.id] = buildDemoLines(employees, p);
  return {
    roles: demoRoles(), users: demoUsers(), userChanges: demoUserChanges(), audit: demoAudit(),
    categories: demoCategories(), expenses: demoExpenses(), dues: demoDues(), expenseHistory: demoExpenseHistory(),
    notification: { globalRecipients: ["damaris.salas@losangeles.cr"] },
    employees, workHistory: demoWorkHistory(), vacations: demoVacations(), disabilities: demoDisabilities(), documents: demoDocuments(), advances: demoAdvances(),
    payrolls, lines, novelties: demoNovelties(), rates: demoRates(), holidays: demoHolidays(),
    demoPassword: "demo-clave-actual-12",
  };
}

export const db: State = seed();

let counter = 1000;
export const uid = (prefix: string) => `${prefix}-${++counter}`;
export const nowISO = () => new Date().toISOString();

export function audit(action: AuditAction, target: string | null, detail: string) {
  db.audit.unshift({ id: uid("aud"), at: nowISO(), actorName: DEMO_ACTOR, actorId: "usr-1", action, target, detail });
}

export function expenseHistory(expenseId: string, action: string, detail: string) {
  db.expenseHistory.unshift({ id: uid("eh"), expenseId, at: nowISO(), actorName: DEMO_ACTOR, action, detail });
}

export function employeeHistory(employeeId: string, date: string, type: WorkHistoryEntry["type"], detail: string, amount?: number) {
  db.workHistory.unshift({ id: uid("wh"), employeeId, date, type, detail, actorName: DEMO_ACTOR, amount });
}

/** Marca como "pendiente de recálculo del servidor" la línea de una planilla en borrador. */
export function markRecalc(payrollId: string, employeeId: string) {
  const p = db.payrolls.find((x) => x.id === payrollId);
  if (!p || p.status !== "DRAFT") return;
  const line = db.lines[payrollId]?.find((l) => l.employeeId === employeeId);
  if (line) line.recalcPending = true;
}

export const done = notifyDataChanged;

export const payrollLabel = (p: Pick<Payroll, "periodStart" | "periodEnd">) => {
  const f = (s: string) => s.split("-").reverse().join("/");
  return `${f(p.periodStart)} – ${f(p.periodEnd)}`;
};

/** Cómputo PROVISIONAL de días (calendario, inclusivo). La regla real de vacaciones la define el backend. */
export function countDaysPlaceholder(start: string, end: string): number {
  const t = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  return Math.round((t(end) - t(start)) / 86_400_000) + 1;
}
