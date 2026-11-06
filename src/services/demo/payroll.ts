import { fail, ok } from "@/lib/result";
import type { PayrollService } from "../contracts";
import { lineTotals, NOVELTY_MAX, NOVELTY_UNIT, type GlobalRate, type PayrollItem, type PayrollLine } from "@/features/payroll/types";
import { validatePayrollPeriod, validateLiquidation, parseNoveltyForm } from "@/features/payroll/validation";
import { buildDemoLines } from "./data/payroll";
import { db, done, markRecalc, payrollLabel, uid } from "./store";
import { DEMO_TODAY } from "./clock";

const payOf = (id: string) => db.payrolls.find((p) => p.id === id);
const CLOSED_MSG = "La planilla está cerrada y no se puede modificar.";

function sumLines(lines: PayrollLine[]) {
  return lines.reduce(
    (acc, l) => {
      const t = lineTotals(l.items);
      return { gross: acc.gross + t.gross, deductions: acc.deductions + t.deductions, net: acc.net + t.net, employer: acc.employer + t.employer };
    },
    { gross: 0, deductions: 0, net: 0, employer: 0 },
  );
}

export const demoPayrollService: PayrollService = {
  async list(f) {
    return db.payrolls
      .filter((p) => !f.status || p.status === f.status)
      .filter((p) => !f.from || p.periodEnd >= f.from)
      .filter((p) => !f.to || p.periodStart <= f.to)
      .sort((a, b) => b.periodStart.localeCompare(a.periodStart))
      .map((p) => {
        const lines = db.lines[p.id] ?? [];
        return { ...p, employeeCount: lines.length, totals: sumLines(lines), recalcPending: lines.some((l) => l.recalcPending) };
      });
  },

  async get(id) {
    const payroll = payOf(id);
    if (!payroll) return null;
    const lines = db.lines[id] ?? [];
    const employer = new Map<string, { code: string; description: string; amount: number }>();
    for (const l of lines)
      for (const i of l.items.filter((x) => x.kind === "EMPLOYER_CONTRIBUTION")) {
        const cur = employer.get(i.code) ?? { code: i.code, description: i.description, amount: 0 };
        cur.amount += i.amount;
        employer.set(i.code, cur);
      }
    return { payroll: { ...payroll }, lines: lines.map((l) => ({ ...l, items: [...l.items] })), totals: sumLines(lines), employerItems: [...employer.values()], recalcPending: lines.some((l) => l.recalcPending) };
  },

  async create(input) {
    const errors = validatePayrollPeriod(input);
    if (Object.keys(errors).length) return fail("VALIDATION", "Revise los campos indicados.", errors);
    if (db.payrolls.some((p) => input.periodStart <= p.periodEnd && p.periodStart <= input.periodEnd))
      return fail("DUPLICATE", "El período ya tiene una planilla.", { periodStart: "Ya existe una planilla que cubre este período." });
    const payroll = { id: uid("pay"), periodStart: input.periodStart, periodEnd: input.periodEnd, status: "DRAFT" as const };
    db.payrolls.push(payroll);
    // El backend real calculará ingresos, deducciones y neto. Aquí se generan líneas de EJEMPLO.
    db.lines[payroll.id] = buildDemoLines(db.employees, payroll);
    done();
    return ok(payroll);
  },

  async editLine(payrollId, employeeId, input) {
    const p = payOf(payrollId);
    const line = db.lines[payrollId]?.find((l) => l.employeeId === employeeId);
    if (!p || !line) return fail("NOT_FOUND", "La planilla o el empleado no existe.");
    if (p.status === "CLOSED") return fail("CONFLICT", CLOSED_MSG);
    const fe: Record<string, string> = {};
    if (!(input.overtimeHours >= 0)) fe.overtime = "El valor no puede ser negativo.";
    if (!(input.extraDeduction >= 0)) fe.extraDeduction = "El valor no puede ser negativo.";
    if (!input.reason.trim()) fe.reason = "Indique el motivo del ajuste.";
    if (Object.keys(fe).length) return fail("VALIDATION", "Revise los campos indicados.", fe);
    // Se guardan los datos ingresados. NO se recalculan montos: eso lo hace el servidor (queda "pendiente de recálculo").
    const ot = line.items.find((i) => i.code === "OVERTIME");
    if (ot) ot.quantity = input.overtimeHours;
    else if (input.overtimeHours > 0) line.items.push({ id: uid("pi"), kind: "EARNING", code: "OVERTIME", description: "Horas extra (monto por calcular)", quantity: input.overtimeHours, amount: 0 });
    line.items = line.items.filter((i) => i.code !== "EXTRA_DEDUCTION");
    if (input.extraDeduction > 0) line.items.push({ id: uid("pi"), kind: "DEDUCTION", code: "EXTRA_DEDUCTION", description: `Deducción adicional: ${input.reason.trim()}`, amount: input.extraDeduction });
    line.recalcPending = true;
    done();
    return ok(undefined);
  },

  async close(payrollId) {
    const p = payOf(payrollId);
    if (!p) return fail("NOT_FOUND", "La planilla no existe.");
    if (p.status === "CLOSED") return fail("CONFLICT", "La planilla ya está cerrada.");
    p.status = "CLOSED";
    p.closedAt = new Date().toISOString();
    db.advances.filter((a) => a.discountPeriodId === p.id && a.status === "PENDIENTE").forEach((a) => {
      a.status = "DESCONTADO";
      a.lockedByClosedPayroll = true;
    });
    done();
    return ok(undefined);
  },

  async checkCcss(payrollId) {
    const p = payOf(payrollId);
    if (!p) return { ok: false, reason: "NOT_CLOSED" };
    if (p.status !== "CLOSED") return { ok: false, reason: "NOT_CLOSED" };
    // PENDIENTE: la lista exacta de campos de la plantilla CCSS la definirá el backend. Aquí se exige la dirección como ejemplo.
    const missing = (db.lines[payrollId] ?? [])
      .map((l) => ({ l, e: db.employees.find((x) => x.id === l.employeeId)! }))
      .filter(({ e }) => !e.address)
      .map(({ l }) => ({ employee: l.employeeName, field: "Dirección" }));
    return missing.length ? { ok: false, reason: "MISSING_DATA", missing } : { ok: true };
  },

  async payslip(payrollId, employeeId) {
    const p = payOf(payrollId);
    const l = db.lines[payrollId]?.find((x) => x.employeeId === employeeId);
    if (!p || !l) return null;
    return { payrollId, periodStart: p.periodStart, periodEnd: p.periodEnd, employeeName: l.employeeName, idNumber: l.idNumber, position: l.position, items: l.items, totals: lineTotals(l.items) };
  },

  async listNovelties(f) {
    return db.novelties
      .filter((n) => !f.payrollId || n.payrollId === f.payrollId)
      .filter((n) => !f.employeeId || n.employeeId === f.employeeId)
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  async saveNovelty(input, id) {
    const p = payOf(input.payrollId);
    const emp = db.employees.find((e) => e.id === input.employeeId);
    const parsed = parseNoveltyForm({ payrollId: input.payrollId, employeeId: input.employeeId, date: input.date, type: input.type, quantity: String(input.quantity ?? ""), note: input.note ?? "" }, p ? { start: p.periodStart, end: p.periodEnd } : undefined);
    if (Object.keys(parsed.errors).length) return fail("VALIDATION", "Revise los campos indicados.", parsed.errors);
    if (!p || !emp) return fail("NOT_FOUND", "La planilla o el empleado no existe.");
    if (p.status === "CLOSED") return fail("CONFLICT", CLOSED_MSG);
    if (!db.lines[p.id]?.some((l) => l.employeeId === emp.id)) return fail("CONFLICT", "El colaborador no forma parte de esta planilla.", { employeeId: "El colaborador no forma parte de esta planilla." });
    const unit = NOVELTY_UNIT[input.type as keyof typeof NOVELTY_UNIT];
    if ((input.quantity ?? 0) > NOVELTY_MAX[unit]) return fail("VALIDATION", "Cantidad fuera de rango.", { quantity: "Cantidad fuera de rango." });
    const base = { payrollId: p.id, employeeId: emp.id, employeeName: `${emp.firstName} ${emp.lastName1}${emp.lastName2 ? " " + emp.lastName2 : ""}`, date: input.date, type: input.type as never, quantity: input.quantity!, note: input.note };
    let result;
    if (id) {
      const n = db.novelties.find((x) => x.id === id);
      if (!n) return fail("NOT_FOUND", "El registro no existe.");
      Object.assign(n, base); // sustituye el efecto anterior sin duplicar (HU-19 esc. 3)
      result = n;
    } else {
      result = { id: uid("nov"), ...base, cancelled: false };
      db.novelties.push(result);
    }
    markRecalc(p.id, emp.id);
    done();
    return ok(result);
  },

  async cancelNovelty(id) {
    const n = db.novelties.find((x) => x.id === id);
    if (!n) return fail("NOT_FOUND", "El registro no existe.");
    const p = payOf(n.payrollId);
    if (p?.status === "CLOSED") return fail("CONFLICT", CLOSED_MSG);
    n.cancelled = true;
    markRecalc(n.payrollId, n.employeeId);
    done();
    return ok(undefined);
  },

  async salaryView(employeeId, payrollId) {
    const e = db.employees.find((x) => x.id === employeeId);
    if (!e) return null;
    const movements = db.payrolls
      .filter((p) => db.lines[p.id]?.some((l) => l.employeeId === employeeId))
      .sort((a, b) => b.periodStart.localeCompare(a.periodStart))
      .map((p) => ({ payrollId: p.id, periodStart: p.periodStart, periodEnd: p.periodEnd, status: p.status, items: db.lines[p.id]!.find((l) => l.employeeId === employeeId)!.items as PayrollItem[] }));
    const selected = movements.find((m) => m.payrollId === payrollId) ?? movements[0];
    const items = selected?.items ?? [];
    return {
      employeeId,
      salaryBasis: e.salaryBasis,
      baseSalary: e.baseSalary,
      workday: e.workday,
      vacationBalanceDays: e.vacationBalanceDays,
      overtimeHours: items.filter((i) => i.code === "OVERTIME").reduce((a, i) => a + (i.quantity ?? 0), 0),
      deductions: items.filter((i) => i.kind === "DEDUCTION").map((i) => ({ description: i.description, amount: i.amount })),
      provisions: { aguinaldo: null, liquidation: null },
      periodLabel: selected ? payrollLabel(selected) : "Sin períodos",
      movements,
    };
  },

  async updateSalaryData(employeeId, input) {
    const e = db.employees.find((x) => x.id === employeeId);
    if (!e) return fail("NOT_FOUND", "El empleado no existe.");
    if (!(input.baseSalary > 0) || !input.workday.trim()) return fail("VALIDATION", "Revise los campos indicados.");
    Object.assign(e, { salaryBasis: input.salaryBasis, baseSalary: input.baseSalary, workday: input.workday.trim(), salaryEffectiveFrom: input.effectiveFrom });
    db.workHistory.unshift({ id: uid("wh"), employeeId, date: input.effectiveFrom, type: "CAMBIO_SALARIAL", detail: "Datos salariales actualizados.", actorName: "Damaris Salas", amount: input.baseSalary });
    // Las planillas cerradas conservan su instantánea (PayrollLine): no se tocan (HU-21 esc. 3).
    done();
    return ok(undefined);
  },

  async listRates() {
    return db.rates.map((r) => ({ ...r }));
  },
  async updateRate(id, input) {
    const r = db.rates.find((x) => x.id === id);
    if (!r) return fail("NOT_FOUND", "El parámetro no existe.");
    if (r.locked) return fail("CONFLICT", r.lockReason ?? "Este valor no se puede modificar.");
    if (r.valueType === "RANGES") {
      const p = input.rangePercents;
      if (!p || p.length !== r.ranges?.length || p.some((x) => !(x >= 0 && x <= 100))) return fail("VALIDATION", "Porcentaje inválido en algún tramo.", { value: "Cada porcentaje debe estar entre 0 y 100." });
      r.ranges = r.ranges.map((t, i) => ({ ...t, percent: p[i] }));
      r.effectiveFrom = input.effectiveFrom;
      done();
      return ok(r as GlobalRate);
    }
    if (input.value === null || input.value < 0 || (r.valueType === "PERCENT" && input.value > 100)) return fail("VALIDATION", "Valor inválido.", { value: "Valor inválido." });
    r.value = input.value;
    r.effectiveFrom = input.effectiveFrom;
    done();
    return ok(r as GlobalRate);
  },

  async calculateLiquidation(input) {
    const e = db.employees.find((x) => x.id === input.employeeId);
    const errors = validateLiquidation(input, e?.hireDate);
    if (Object.keys(errors).length) return fail("VALIDATION", "Revise los campos indicados.", errors);
    if (!e) return fail("NOT_FOUND", "El empleado no existe.");
    const hasHistory = db.workHistory.some((h) => h.employeeId === e.id && h.amount !== undefined);
    if (!hasHistory)
      return ok({ status: "MISSING_DATA" as const, missing: ["Historial salarial del empleado.", "Reglas de cálculo de liquidación configuradas por la administración."] });
    // EJEMPLO ILUSTRATIVO con cifras fijas: la regla real de liquidación está pendiente de documentar.
    const concepts = [
      { concept: "Preaviso (ejemplo)", basis: "Según motivo de salida", days: 15, amount: 325000 },
      { concept: "Cesantía (ejemplo)", basis: "Según antigüedad", days: 40, amount: 866000 },
      { concept: "Vacaciones proporcionales (ejemplo)", basis: "Saldo de vacaciones", days: e.vacationBalanceDays, amount: 216000 },
      { concept: "Aguinaldo proporcional (ejemplo)", basis: "Acumulado del período", days: null, amount: 245000 },
    ];
    return ok({
      status: "ILLUSTRATIVE" as const,
      usedData: [
        { label: "Fecha de ingreso", value: e.hireDate.split("-").reverse().join("/") },
        { label: "Fecha de salida", value: input.exitDate.split("-").reverse().join("/") },
        { label: "Saldo de vacaciones", value: `${e.vacationBalanceDays} días` },
        { label: "Fecha de consulta", value: DEMO_TODAY.split("-").reverse().join("/") },
      ],
      concepts,
      total: concepts.reduce((a, c) => a + c.amount, 0),
    });
  },

  async periodsForAdvances() {
    return db.payrolls.filter((p) => p.status === "DRAFT").map((p) => ({ id: p.id, label: payrollLabel(p) }));
  },
};
