import { fail, ok } from "@/lib/result";
import { formatDate } from "@/lib/format";
import type { EmployeesService } from "../contracts";
import { fullName, type Employee } from "@/features/employees/types";
import { parseEmployeeForm, validateDateRange } from "@/features/employees/validation";
import { countDaysPlaceholder, db, done, employeeHistory, markRecalc, nowISO, payrollLabel, uid } from "./store";
import { DEMO_ACTOR, DEMO_TODAY } from "./clock";

const empOf = (id: string) => db.employees.find((e) => e.id === id);
const CLOSED = "La planilla del período está cerrada; el cambio debe resolverse como ajuste.";

function validateEmployee(input: Parameters<EmployeesService["create"]>[0]) {
  return parseEmployeeForm(
    {
      idType: input.idType, idNumber: input.idNumber, firstName: input.firstName, lastName1: input.lastName1, lastName2: input.lastName2 ?? "",
      birthDate: input.birthDate, email: input.email ?? "", phone: input.phone ?? "", address: input.address ?? "", position: input.position,
      hireDate: input.hireDate, salaryBasis: input.salaryBasis, baseSalary: String(input.baseSalary), contractEndsOn: input.contractEndsOn ?? "",
    },
    DEMO_TODAY,
  ).errors;
}

const overlaps = (a: { start: string; end: string }, b: { start: string; end: string }) => a.start <= b.end && b.start <= a.end;

export const demoEmployeesService: EmployeesService = {
  async list(f) {
    const q = f.search?.trim().toLowerCase();
    return db.employees
      .filter((e) => !q || fullName(e).toLowerCase().includes(q) || e.idNumber.toLowerCase().includes(q))
      .filter((e) => !f.active || f.active === "all" || (f.active === "active") === e.active)
      .filter((e) => !f.position || e.position === f.position)
      .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  },
  async positions() {
    return [...new Set(db.employees.map((e) => e.position))].sort();
  },
  async getRecord(id) {
    const employee = empOf(id);
    if (!employee) return null;
    return {
      employee: { ...employee },
      documents: db.documents.filter((d) => d.employeeId === id),
      vacations: db.vacations.filter((v) => v.employeeId === id).sort((a, b) => b.start.localeCompare(a.start)),
      disabilities: db.disabilities.filter((v) => v.employeeId === id).sort((a, b) => b.start.localeCompare(a.start)),
      advances: db.advances.filter((a) => a.employeeId === id).sort((a, b) => b.date.localeCompare(a.date)),
    };
  },
  async create(input) {
    const errors = validateEmployee(input);
    if (Object.keys(errors).length) return fail("VALIDATION", "Revise los campos indicados.", errors);
    const dup = db.employees.find((e) => e.idType === input.idType && e.idNumber === input.idNumber);
    if (dup) return fail("DUPLICATE", `El empleado ya existe (estado actual: ${dup.active ? "Activo" : "Inactivo"}).`, { idNumber: `Ya existe un empleado con esta identificación (${dup.active ? "activo" : "inactivo"}).` });
    const emp: Employee = { ...input, id: uid("emp"), active: true, vacationBalanceDays: 0, workday: "Por definir", salaryEffectiveFrom: input.hireDate };
    db.employees.push(emp);
    employeeHistory(emp.id, input.hireDate, "INGRESO", `Ingreso como ${input.position}.`, input.baseSalary);
    done();
    return ok(emp);
  },
  async update(id, input) {
    const emp = empOf(id);
    if (!emp) return fail("NOT_FOUND", "El empleado no existe.");
    const errors = validateEmployee(input);
    if (Object.keys(errors).length) return fail("VALIDATION", "Revise los campos indicados.", errors);
    if (db.employees.some((e) => e.id !== id && e.idType === input.idType && e.idNumber === input.idNumber))
      return fail("DUPLICATE", "Esta identificación ya pertenece a otro empleado.", { idNumber: "Esta identificación ya pertenece a otro empleado." });
    const changedSalary = input.baseSalary !== emp.baseSalary;
    Object.assign(emp, input);
    employeeHistory(id, DEMO_TODAY, "EDICION", "Se actualizaron datos personales o laborales.");
    if (changedSalary) employeeHistory(id, DEMO_TODAY, "CAMBIO_SALARIAL", "Cambio de salario base.", input.baseSalary);
    done();
    return ok(emp);
  },
  async deactivate(id, input) {
    const emp = empOf(id);
    if (!emp) return fail("NOT_FOUND", "El empleado no existe.");
    const fe: Record<string, string> = {};
    if (!input.date) fe.date = "Indique la fecha de salida.";
    else if (input.date < emp.hireDate) fe.date = "La fecha de salida no puede ser anterior a la fecha de ingreso.";
    if (!input.reason?.trim()) fe.reason = "Indique el motivo.";
    if (Object.keys(fe).length) return fail("VALIDATION", "Revise los campos indicados.", fe);
    emp.active = false;
    emp.statusChangedAt = input.date;
    emp.statusReason = input.reason;
    employeeHistory(id, input.date, "SALIDA", `${input.reason}. Fecha de salida ${formatDate(input.date)}.`);
    done();
    return ok(undefined);
  },
  async reactivate(id, input) {
    const emp = empOf(id);
    if (!emp) return fail("NOT_FOUND", "El empleado no existe.");
    if (!input.date) return fail("VALIDATION", "Indique la fecha de reingreso.", { date: "Indique la fecha de reingreso." });
    if (input.date < emp.hireDate) return fail("VALIDATION", "Fecha inválida.", { date: "La fecha no puede ser anterior a la fecha de ingreso." });
    emp.active = true;
    emp.statusChangedAt = input.date;
    emp.statusReason = undefined;
    employeeHistory(id, input.date, "REINGRESO", `Reingreso el ${formatDate(input.date)}.`);
    done();
    return ok(undefined);
  },
  async history(id, f) {
    return db.workHistory
      .filter((h) => h.employeeId === id)
      .filter((h) => !f.type || h.type === f.type)
      .filter((h) => !f.from || h.date >= f.from)
      .filter((h) => !f.to || h.date <= f.to)
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  async addVacation(id, input) {
    const emp = empOf(id);
    if (!emp) return fail("NOT_FOUND", "El empleado no existe.");
    if (!emp.active) return fail("CONFLICT", "El empleado está inactivo.");
    const errors = validateDateRange(input);
    if (Object.keys(errors).length) return fail("VALIDATION", "Revise los campos indicados.", errors);
    if (db.vacations.some((v) => v.employeeId === id && !v.cancelled && overlaps(v, input)) || db.disabilities.some((d) => d.employeeId === id && !d.cancelled && overlaps(d, input)))
      return fail("CONFLICT", "Las fechas se traslapan con otras vacaciones o con una incapacidad.", { start: "Fechas traslapadas." });
    const days = countDaysPlaceholder(input.start, input.end);
    if (days > emp.vacationBalanceDays) return fail("CONFLICT", `Los días superan el saldo disponible (${emp.vacationBalanceDays}).`, { end: `Saldo disponible: ${emp.vacationBalanceDays} días.` });
    db.vacations.push({ id: uid("vac"), employeeId: id, start: input.start, end: input.end, days, cancelled: false, payrollClosed: false });
    emp.vacationBalanceDays -= days;
    employeeHistory(id, input.start, "VACACIONES", `Vacaciones del ${formatDate(input.start)} al ${formatDate(input.end)} (${days} días).`);
    done();
    return ok(undefined);
  },
  async updateVacation(id, vacationId, input) {
    const emp = empOf(id);
    const v = db.vacations.find((x) => x.id === vacationId);
    if (!emp || !v) return fail("NOT_FOUND", "El registro no existe.");
    if (v.payrollClosed) return fail("CONFLICT", CLOSED);
    const errors = validateDateRange(input);
    if (Object.keys(errors).length) return fail("VALIDATION", "Revise los campos indicados.", errors);
    if (db.vacations.some((x) => x.id !== v.id && x.employeeId === id && !x.cancelled && overlaps(x, input)) || db.disabilities.some((d) => d.employeeId === id && !d.cancelled && overlaps(d, input)))
      return fail("CONFLICT", "Las fechas se traslapan con otras vacaciones o con una incapacidad.");
    const days = countDaysPlaceholder(input.start, input.end);
    if (days > emp.vacationBalanceDays + v.days) return fail("CONFLICT", `Los días superan el saldo disponible (${emp.vacationBalanceDays + v.days}).`);
    emp.vacationBalanceDays += v.days - days;
    Object.assign(v, { start: input.start, end: input.end, days });
    employeeHistory(id, input.start, "VACACIONES", `Vacaciones modificadas: ${formatDate(input.start)} al ${formatDate(input.end)} (${days} días).`);
    done();
    return ok(undefined);
  },
  async cancelVacation(id, vacationId) {
    const emp = empOf(id);
    const v = db.vacations.find((x) => x.id === vacationId);
    if (!emp || !v) return fail("NOT_FOUND", "El registro no existe.");
    if (v.payrollClosed) return fail("CONFLICT", CLOSED);
    v.cancelled = true;
    emp.vacationBalanceDays += v.days;
    employeeHistory(id, DEMO_TODAY, "VACACIONES", `Vacaciones del ${formatDate(v.start)} anuladas; saldo restituido.`);
    done();
    return ok(undefined);
  },

  async addDisability(id, input) {
    const emp = empOf(id);
    if (!emp) return fail("NOT_FOUND", "El empleado no existe.");
    if (!emp.active) return fail("CONFLICT", "El empleado está inactivo.");
    const errors = { ...validateDateRange(input), ...(input.type ? {} : { type: "Seleccione el tipo de incapacidad." }) };
    if (Object.keys(errors).length) return fail("VALIDATION", "Revise los campos indicados.", errors);
    if (db.disabilities.some((d) => d.employeeId === id && !d.cancelled && overlaps(d, input)) || db.vacations.some((v) => v.employeeId === id && !v.cancelled && overlaps(v, input)))
      return fail("CONFLICT", "Las fechas se traslapan con otra incapacidad o con vacaciones.");
    db.disabilities.push({ id: uid("inc"), employeeId: id, start: input.start, end: input.end, type: input.type as never, receipt: input.receipt, cancelled: false, payrollClosed: false });
    employeeHistory(id, input.start, "INCAPACIDAD", `Incapacidad del ${formatDate(input.start)} al ${formatDate(input.end)}.`);
    done();
    return ok(undefined);
  },
  async updateDisability(id, disabilityId, input) {
    const d = db.disabilities.find((x) => x.id === disabilityId);
    if (!d) return fail("NOT_FOUND", "El registro no existe.");
    if (d.payrollClosed) return fail("CONFLICT", CLOSED);
    const errors = { ...validateDateRange(input), ...(input.type ? {} : { type: "Seleccione el tipo de incapacidad." }) };
    if (Object.keys(errors).length) return fail("VALIDATION", "Revise los campos indicados.", errors);
    if (db.disabilities.some((x) => x.id !== d.id && x.employeeId === id && !x.cancelled && overlaps(x, input)) || db.vacations.some((v) => v.employeeId === id && !v.cancelled && overlaps(v, input)))
      return fail("CONFLICT", "Las fechas se traslapan con otra incapacidad o con vacaciones.");
    Object.assign(d, { start: input.start, end: input.end, type: input.type, receipt: input.receipt ?? d.receipt });
    employeeHistory(id, input.start, "INCAPACIDAD", "Incapacidad modificada.");
    done();
    return ok(undefined);
  },
  async cancelDisability(id, disabilityId) {
    const d = db.disabilities.find((x) => x.id === disabilityId);
    if (!d) return fail("NOT_FOUND", "El registro no existe.");
    if (d.payrollClosed) return fail("CONFLICT", CLOSED);
    d.cancelled = true;
    employeeHistory(id, DEMO_TODAY, "INCAPACIDAD", `Incapacidad del ${formatDate(d.start)} anulada.`);
    done();
    return ok(undefined);
  },

  async addDocument(id, input) {
    if (!empOf(id)) return fail("NOT_FOUND", "El empleado no existe.");
    if (!input.type) return fail("VALIDATION", "Seleccione el tipo de documento.", { type: "Seleccione el tipo de documento." });
    db.documents.push({ id: uid("doc"), employeeId: id, type: input.type, fileName: input.fileName, size: input.size, uploadedAt: nowISO(), uploadedBy: DEMO_ACTOR, expiresOn: input.expiresOn });
    done();
    return ok(undefined);
  },
  async replaceDocument(id, documentId, file) {
    const d = db.documents.find((x) => x.id === documentId && x.employeeId === id);
    if (!d) return fail("NOT_FOUND", "El documento no existe.");
    Object.assign(d, { fileName: file.fileName, size: file.size, uploadedAt: nowISO(), uploadedBy: DEMO_ACTOR });
    done();
    return ok(undefined);
  },
  async removeDocument(id, documentId) {
    const i = db.documents.findIndex((x) => x.id === documentId && x.employeeId === id);
    if (i < 0) return fail("NOT_FOUND", "El documento no existe.");
    db.documents.splice(i, 1);
    done();
    return ok(undefined);
  },

  async addAdvance(id, input) {
    const emp = empOf(id);
    if (!emp) return fail("NOT_FOUND", "El empleado no existe.");
    if (!emp.active) return fail("CONFLICT", "El empleado está inactivo.");
    const period = db.payrolls.find((p) => p.id === input.discountPeriodId);
    if (!period) return fail("VALIDATION", "Seleccione el período de descuento.", { periodId: "Seleccione el período de descuento." });
    const adv = { id: uid("adv"), employeeId: id, amount: input.amount, date: input.date, discountPeriodId: period.id, discountPeriodLabel: payrollLabel(period), note: input.note, status: "PENDIENTE" as const, lockedByClosedPayroll: false };
    db.advances.push(adv);
    markRecalc(period.id, id);
    done();
    return ok(adv);
  },
  async updateAdvance(id, advanceId, input) {
    const a = db.advances.find((x) => x.id === advanceId && x.employeeId === id);
    if (!a) return fail("NOT_FOUND", "El adelanto no existe.");
    if (a.lockedByClosedPayroll || a.status !== "PENDIENTE") return fail("CONFLICT", "El adelanto ya fue descontado en una planilla cerrada y no se puede modificar.");
    const period = db.payrolls.find((p) => p.id === input.discountPeriodId);
    if (!period) return fail("VALIDATION", "Seleccione el período.", { periodId: "Seleccione el período de descuento." });
    Object.assign(a, { amount: input.amount, date: input.date, discountPeriodId: period.id, discountPeriodLabel: payrollLabel(period), note: input.note });
    markRecalc(period.id, id);
    done();
    return ok(undefined);
  },
  async cancelAdvance(id, advanceId) {
    const a = db.advances.find((x) => x.id === advanceId && x.employeeId === id);
    if (!a) return fail("NOT_FOUND", "El adelanto no existe.");
    if (a.lockedByClosedPayroll || a.status !== "PENDIENTE") return fail("CONFLICT", "El adelanto ya fue descontado en una planilla cerrada y no se puede anular.");
    a.status = "ANULADO";
    markRecalc(a.discountPeriodId, id);
    done();
    return ok(undefined);
  },
};
