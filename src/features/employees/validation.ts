import { isBlank, isEmail, isValidDate, MSG, parseNumber } from "@/lib/validation";
import type { FieldErrors } from "@/lib/result";
import type { ISODate } from "@/lib/format";
import { DOCUMENT_TYPES_WITH_EXPIRY, type DocumentType, type EmployeeInput, type IdType, type SalaryBasis } from "./types";

export function idFormatProblem(type: IdType, value: string): string | null {
  const v = value.trim();
  if (type === "NATIONAL_ID") return /^\d{9}$|^\d-\d{4}-\d{4}$/.test(v) ? null : "Cédula inválida. Use el formato 1-2345-6789 (9 dígitos).";
  if (type === "DIMEX") return /^\d{11,12}$/.test(v) ? null : "DIMEX inválido. Debe tener 11 o 12 dígitos.";
  return /^[A-Za-z0-9]{6,20}$/.test(v) ? null : "Pasaporte inválido. Use de 6 a 20 letras o números.";
}

export type EmployeeFormValues = {
  idType: IdType | "";
  idNumber: string;
  firstName: string;
  lastName1: string;
  lastName2: string;
  birthDate: string;
  email: string;
  phone: string;
  address: string;
  position: string;
  hireDate: string;
  salaryBasis: SalaryBasis | "";
  baseSalary: string;
  contractEndsOn: string;
};

/** HU-25 y HU-28. `today` es la fecha actual (el servidor usa la suya). */
export function parseEmployeeForm(v: EmployeeFormValues, today: ISODate): { errors: FieldErrors; input?: EmployeeInput } {
  const e: FieldErrors = {};
  if (!v.idType) e.idType = "Seleccione el tipo de identificación.";
  if (isBlank(v.idNumber)) e.idNumber = MSG.required;
  else if (v.idType) {
    const p = idFormatProblem(v.idType, v.idNumber);
    if (p) e.idNumber = p;
  }
  if (isBlank(v.firstName)) e.firstName = MSG.required;
  if (isBlank(v.lastName1)) e.lastName1 = MSG.required;
  if (isBlank(v.birthDate)) e.birthDate = MSG.required;
  else if (!isValidDate(v.birthDate)) e.birthDate = "La fecha de nacimiento no existe.";
  else if (v.birthDate > today) e.birthDate = MSG.futureDate;
  if (isBlank(v.hireDate)) e.hireDate = MSG.required;
  else if (!isValidDate(v.hireDate)) e.hireDate = "La fecha de ingreso no existe.";
  else if (v.hireDate > today) e.hireDate = MSG.futureDate;
  if (!isBlank(v.email) && !isEmail(v.email)) e.email = MSG.email;
  if (isBlank(v.position)) e.position = MSG.required;
  if (!v.salaryBasis) e.salaryBasis = "Seleccione el tipo de salario.";
  const salary = parseNumber(v.baseSalary);
  if (isBlank(v.baseSalary)) e.baseSalary = MSG.required;
  else if (salary === null || salary <= 0) e.baseSalary = MSG.amount;
  if (!isBlank(v.contractEndsOn) && !isValidDate(v.contractEndsOn)) e.contractEndsOn = MSG.date;
  if (Object.keys(e).length) return { errors: e };
  return {
    errors: e,
    input: {
      idType: v.idType as IdType,
      idNumber: v.idNumber.trim(),
      firstName: v.firstName.trim(),
      lastName1: v.lastName1.trim(),
      lastName2: v.lastName2.trim() || undefined,
      birthDate: v.birthDate,
      email: v.email.trim() || undefined,
      phone: v.phone.trim() || undefined,
      address: v.address.trim() || undefined,
      position: v.position.trim(),
      hireDate: v.hireDate,
      salaryBasis: v.salaryBasis as SalaryBasis,
      baseSalary: salary!,
      contractEndsOn: v.contractEndsOn || undefined,
    },
  };
}

/** HU-29: inactivar (fecha + motivo) o reactivar (fecha de reingreso). */
export function validateStatusChange(v: { date: string; reason?: string }, opts: { needsReason: boolean; hireDate: ISODate; today: ISODate }): FieldErrors {
  const e: FieldErrors = {};
  if (isBlank(v.date)) e.date = MSG.required;
  else if (!isValidDate(v.date)) e.date = MSG.date;
  else if (v.date < opts.hireDate) e.date = "La fecha no puede ser anterior a la fecha de ingreso.";
  if (opts.needsReason && isBlank(v.reason)) e.reason = "Indique el motivo.";
  return e;
}

/** HU-31 y HU-32 (fechas). Los traslapes y el saldo los valida el servidor. */
export function validateDateRange(v: { start: string; end: string }): FieldErrors {
  const e: FieldErrors = {};
  if (isBlank(v.start)) e.start = MSG.required;
  else if (!isValidDate(v.start)) e.start = MSG.date;
  if (isBlank(v.end)) e.end = MSG.required;
  else if (!isValidDate(v.end)) e.end = MSG.date;
  if (!e.start && !e.end && v.end < v.start) e.end = "La fecha final no puede ser anterior a la inicial.";
  return e;
}

export function validateDocument(v: { type: string; hasFile: boolean; expiresOn: string }): FieldErrors {
  const e: FieldErrors = {};
  if (!v.hasFile) e.file = "Seleccione un archivo.";
  if (!v.type) e.type = "Seleccione el tipo de documento.";
  if (v.type && (DOCUMENT_TYPES_WITH_EXPIRY as string[]).includes(v.type as DocumentType)) {
    if (isBlank(v.expiresOn)) e.expiresOn = "Indique la fecha de vencimiento.";
    else if (!isValidDate(v.expiresOn)) e.expiresOn = MSG.date;
  }
  return e;
}

/** HU-35. El límite configurable del adelanto aún no existe: PENDIENTE de definir con la administración. */
export function parseAdvanceForm(v: { amount: string; date: string; periodId: string }): { errors: FieldErrors; amount?: number } {
  const e: FieldErrors = {};
  const amount = parseNumber(v.amount);
  if (isBlank(v.amount)) e.amount = MSG.required;
  else if (amount === null) e.amount = MSG.number;
  else if (amount <= 0) e.amount = MSG.amount;
  if (isBlank(v.date)) e.date = MSG.required;
  else if (!isValidDate(v.date)) e.date = MSG.date;
  if (isBlank(v.periodId)) e.periodId = "Seleccione el período de descuento.";
  return Object.keys(e).length ? { errors: e } : { errors: e, amount: amount! };
}

/** HU-21. */
export function parseSalaryForm(v: { salaryBasis: string; baseSalary: string; workday: string; effectiveFrom: string }): { errors: FieldErrors; baseSalary?: number } {
  const e: FieldErrors = {};
  if (!v.salaryBasis) e.salaryBasis = "Seleccione el tipo de salario.";
  const s = parseNumber(v.baseSalary);
  if (isBlank(v.baseSalary)) e.baseSalary = MSG.required;
  else if (s === null || s <= 0) e.baseSalary = MSG.amount;
  if (isBlank(v.workday)) e.workday = MSG.required;
  if (isBlank(v.effectiveFrom)) e.effectiveFrom = MSG.required;
  else if (!isValidDate(v.effectiveFrom)) e.effectiveFrom = MSG.date;
  return Object.keys(e).length ? { errors: e } : { errors: e, baseSalary: s! };
}
