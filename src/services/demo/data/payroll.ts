import type { Employee } from "@/features/employees/types";
import type { GlobalRate, Novelty, Payroll, PayrollItem, PayrollLine } from "@/features/payroll/types";
import { fullName } from "@/features/employees/types";

export const demoPayrolls = (): Payroll[] => [
  { id: "pay-1", periodStart: "2026-08-01", periodEnd: "2026-08-15", status: "CLOSED", closedAt: "2026-08-16T09:00:00-06:00", paidAt: "2026-08-16" },
  { id: "pay-2", periodStart: "2026-08-16", periodEnd: "2026-08-31", status: "CLOSED", closedAt: "2026-09-01T09:00:00-06:00", paidAt: "2026-09-01" },
  { id: "pay-3", periodStart: "2026-09-01", periodEnd: "2026-09-15", status: "CLOSED", closedAt: "2026-09-16T09:00:00-06:00", paidAt: "2026-09-16" },
  { id: "pay-4", periodStart: "2026-09-16", periodEnd: "2026-09-30", status: "CLOSED", closedAt: "2026-10-01T09:00:00-06:00", paidAt: "2026-10-01" },
  { id: "pay-5", periodStart: "2026-10-01", periodEnd: "2026-10-15", status: "CLOSED", closedAt: "2026-10-16T09:00:00-06:00", paidAt: "2026-10-16" },
  { id: "pay-6", periodStart: "2026-10-16", periodEnd: "2026-10-31", status: "DRAFT" },
];

const OVERTIME_BY_PERIOD: Record<string, Record<string, number>> = {
  "pay-1": { "emp-1": 4, "emp-3": 6 },
  "pay-2": { "emp-1": 6, "emp-2": 3, "emp-3": 4 },
  "pay-3": { "emp-1": 5, "emp-4": 2 },
  "pay-4": { "emp-1": 8, "emp-3": 5, "emp-7": 3 },
  "pay-5": { "emp-1": 4, "emp-2": 2, "emp-3": 6, "emp-6": 3 },
  "pay-6": { "emp-1": 6, "emp-3": 4 },
};

let seq = 0;
const it = (kind: PayrollItem["kind"], code: string, description: string, amount: number, quantity?: number): PayrollItem => ({
  id: `pi-${++seq}`, kind, code, description, amount, quantity,
});

/**
 * DATOS DE EJEMPLO. Los porcentajes usados aquí NO son reglas del sistema: son cifras ilustrativas para poblar
 * la interfaz. Los montos reales los calculará el backend con las reglas aprobadas (pendientes de documentar).
 */
export function buildDemoLine(emp: Employee, payrollId: string): PayrollLine {
  const items: PayrollItem[] = [];
  const base = emp.salaryBasis === "MONTHLY" ? emp.baseSalary / 2 : emp.baseSalary * 96;
  items.push(it("EARNING", "ORDINARY", "Salario ordinario", base, emp.salaryBasis === "HOURLY" ? 96 : undefined));
  const ot = OVERTIME_BY_PERIOD[payrollId]?.[emp.id] ?? 0;
  const hourly = emp.salaryBasis === "MONTHLY" ? emp.baseSalary / 240 : emp.baseSalary;
  if (ot) items.push(it("EARNING", "OVERTIME", "Horas extra", Math.round(ot * hourly * 1.5), ot));
  const gross = items.reduce((a, i) => a + i.amount, 0);
  items.push(it("DEDUCTION", "CCSS_EMPLOYEE", "Cuota obrera CCSS (ejemplo)", Math.round(gross * 0.1067)));
  items.push(it("EMPLOYER_CONTRIBUTION", "CCSS_EMPLOYER", "Cargas patronales CCSS (ejemplo)", Math.round(gross * 0.2667)));
  return { employeeId: emp.id, employeeName: fullName(emp), idNumber: emp.idNumber, position: emp.position, items, recalcPending: false };
}

export function buildDemoLines(employees: Employee[], payroll: Payroll): PayrollLine[] {
  return employees
    .filter((e) => e.hireDate <= payroll.periodEnd && (e.active || (e.statusChangedAt ?? "") >= payroll.periodStart))
    .map((e) => buildDemoLine(e, payroll.id));
}

export const demoNovelties = (): Novelty[] => [
  { id: "nov-1", payrollId: "pay-6", employeeId: "emp-1", employeeName: "Carlos Mora Jiménez", date: "2026-10-24", type: "HORAS_EXTRA", quantity: 6, note: "Cierre de inventario de carnicería.", cancelled: false },
  { id: "nov-2", payrollId: "pay-6", employeeId: "emp-3", employeeName: "José Pablo Rojas Araya", date: "2026-10-27", type: "HORAS_EXTRA", quantity: 4, note: "Recepción de mercadería.", cancelled: false },
  { id: "nov-3", payrollId: "pay-6", employeeId: "emp-4", employeeName: "Andrea Cascante Núñez", date: "2026-10-29", type: "PERMISO_SIN_GOCE", quantity: 1, note: "Trámite personal.", cancelled: false },
  { id: "nov-4", payrollId: "pay-3", employeeId: "emp-7", employeeName: "Esteban Brenes Mora", date: "2026-09-15", type: "FERIADO_TRABAJADO", quantity: 1, note: "Día de la Independencia.", cancelled: false },
  { id: "nov-5", payrollId: "pay-2", employeeId: "emp-1", employeeName: "Carlos Mora Jiménez", date: "2026-08-31", type: "FERIADO_TRABAJADO", quantity: 1, cancelled: false },
];

/** Parámetros de ejemplo, NO oficiales. Los valores vigentes los define la administración (HU-22). */
export const demoRates = (): GlobalRate[] => [
  { id: "rate-1", concept: "Seguro de Enfermedad y Maternidad (SEM)", institution: "CCSS", scope: "OBRERO", valueType: "PERCENT", value: 5.5, effectiveFrom: "2026-01-01", locked: false },
  { id: "rate-2", concept: "Invalidez, Vejez y Muerte (IVM)", institution: "CCSS", scope: "OBRERO", valueType: "PERCENT", value: 4.17, effectiveFrom: "2026-01-01", locked: false },
  { id: "rate-3", concept: "Aporte Banco Popular", institution: "Banco Popular", scope: "OBRERO", valueType: "PERCENT", value: 1, effectiveFrom: "2026-01-01", locked: true, lockReason: "Porcentaje fijado por ley; solo puede cambiar con una reforma legal." },
  { id: "rate-4", concept: "Cuota patronal CCSS (SEM + IVM)", institution: "CCSS", scope: "PATRONAL", valueType: "PERCENT", value: 14.67, effectiveFrom: "2026-01-01", locked: false },
  { id: "rate-5", concept: "Póliza de riesgos del trabajo", institution: "INS", scope: "PATRONAL", valueType: "PERCENT", value: 1.5, effectiveFrom: "2026-01-01", locked: false },
  {
    id: "rate-6", concept: "Impuesto sobre la renta (rebajo por rango de salario)", institution: "Ministerio de Hacienda", scope: "OBRERO", valueType: "RANGES", value: null, effectiveFrom: "2026-01-01", locked: false,
    ranges: [{ from: 0, to: 918000, percent: 0 }, { from: 918000, to: 1347000, percent: 10 }, { from: 1347000, to: null, percent: 15 }],
  },
];

/** Feriados de ejemplo (la lista oficial la mantendrá el backend). */
export const demoHolidays = (): { date: string; name: string }[] => [
  { date: "2026-08-15", name: "Día de la Madre" },
  { date: "2026-08-31", name: "Día de la Persona Negra y la Cultura Afrocostarricense" },
  { date: "2026-09-15", name: "Día de la Independencia" },
  { date: "2026-12-01", name: "Día de la Abolición del Ejército" },
  { date: "2026-12-25", name: "Navidad" },
  { date: "2027-01-01", name: "Año Nuevo" },
];
