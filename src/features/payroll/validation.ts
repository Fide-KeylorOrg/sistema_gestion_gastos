import { isBlank, isValidDate, MSG, parseNumber } from "@/lib/validation";
import type { FieldErrors } from "@/lib/result";
import type { ISODate } from "@/lib/format";
import { NOVELTY_MAX, NOVELTY_UNIT, type NoveltyInput, type NoveltyType } from "./types";

/** HU-16 escenario 2. */
export function validatePayrollPeriod(v: { periodStart: string; periodEnd: string }): FieldErrors {
  const e: FieldErrors = {};
  if (isBlank(v.periodStart)) e.periodStart = "Indique la fecha inicial.";
  else if (!isValidDate(v.periodStart)) e.periodStart = MSG.date;
  if (isBlank(v.periodEnd)) e.periodEnd = "Indique la fecha final.";
  else if (!isValidDate(v.periodEnd)) e.periodEnd = MSG.date;
  if (!e.periodStart && !e.periodEnd && v.periodEnd < v.periodStart) e.periodEnd = "La fecha final no puede ser anterior a la inicial.";
  return e;
}

/** HU-18 escenario 2: horas o deducciones negativas, no numéricas o sin motivo. */
export function parseLineEdit(v: { overtime: string; extraDeduction: string; reason: string }): { errors: FieldErrors; overtime?: number; extraDeduction?: number } {
  const e: FieldErrors = {};
  const ot = parseNumber(v.overtime || "0");
  const ded = parseNumber(v.extraDeduction || "0");
  if (ot === null) e.overtime = MSG.number;
  else if (ot < 0) e.overtime = MSG.negative;
  if (ded === null) e.extraDeduction = MSG.number;
  else if (ded < 0) e.extraDeduction = MSG.negative;
  if (isBlank(v.reason)) e.reason = "Indique el motivo del ajuste.";
  return Object.keys(e).length ? { errors: e } : { errors: e, overtime: ot!, extraDeduction: ded! };
}

export type NoveltyFormValues = { payrollId: string; employeeId: string; date: string; type: NoveltyType | ""; quantity: string; note: string };

/** HU-19 escenario 2. `period` limita la fecha al período seleccionado. */
export function parseNoveltyForm(v: NoveltyFormValues, period?: { start: ISODate; end: ISODate }): { errors: FieldErrors; input?: NoveltyInput } {
  const e: FieldErrors = {};
  if (isBlank(v.payrollId)) e.payrollId = "Seleccione el período.";
  if (isBlank(v.employeeId)) e.employeeId = "Seleccione el colaborador.";
  if (isBlank(v.date)) e.date = MSG.required;
  else if (!isValidDate(v.date)) e.date = MSG.date;
  else if (period && (v.date < period.start || v.date > period.end)) e.date = "La fecha debe estar dentro del período de la planilla.";
  if (!v.type) e.type = "Seleccione el tipo de registro.";
  const q = parseNumber(v.quantity);
  if (isBlank(v.quantity)) e.quantity = MSG.required;
  else if (q === null) e.quantity = MSG.number;
  else if (q <= 0) e.quantity = "La cantidad debe ser mayor que cero.";
  else if (v.type) {
    const unit = NOVELTY_UNIT[v.type as NoveltyType];
    if (q > NOVELTY_MAX[unit]) e.quantity = `La cantidad está fuera de rango (máximo ${NOVELTY_MAX[unit]} ${unit} por registro).`;
  }
  if (Object.keys(e).length) return { errors: e };
  return { errors: e, input: { payrollId: v.payrollId, employeeId: v.employeeId, date: v.date, type: v.type as NoveltyType, quantity: q!, note: v.note.trim() || undefined } };
}

/** HU-22. */
export function parseRateForm(v: { value: string; effectiveFrom: string }, percent: boolean): { errors: FieldErrors; value?: number } {
  const e: FieldErrors = {};
  const n = parseNumber(v.value);
  if (isBlank(v.value)) e.value = MSG.required;
  else if (n === null) e.value = MSG.number;
  else if (n < 0) e.value = MSG.negative;
  else if (percent && n > 100) e.value = "El porcentaje no puede superar 100.";
  if (isBlank(v.effectiveFrom)) e.effectiveFrom = MSG.required;
  else if (!isValidDate(v.effectiveFrom)) e.effectiveFrom = MSG.date;
  return Object.keys(e).length ? { errors: e } : { errors: e, value: n! };
}

/** HU-23 escenarios 2 y 3 (parte de cliente). */
export function validateLiquidation(v: { employeeId: string; exitDate: string; exitReason: string }, hireDate?: ISODate): FieldErrors {
  const e: FieldErrors = {};
  if (isBlank(v.employeeId)) e.employeeId = "Seleccione el empleado.";
  if (isBlank(v.exitDate)) e.exitDate = "Indique la fecha de salida.";
  else if (!isValidDate(v.exitDate)) e.exitDate = MSG.date;
  else if (hireDate && v.exitDate < hireDate) e.exitDate = "La fecha de salida no puede ser anterior a la fecha de ingreso.";
  if (isBlank(v.exitReason)) e.exitReason = "Seleccione el motivo de salida.";
  return e;
}
