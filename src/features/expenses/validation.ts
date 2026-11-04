import { isBlank, isEmail, isValidDate, MSG, parseNumber } from "@/lib/validation";
import type { FieldErrors } from "@/lib/result";
import type { ISODate } from "@/lib/format";
import type { ExpenseInput, ExpenseKind, Recurrence } from "./types";

export type ExpenseFormValues = {
  concept: string;
  categoryId: string;
  kind: ExpenseKind;
  amount: string;
  dueDate: string;
  referenceNumber: string;
  notes: string;
  recurring: boolean;
  recurrence: Recurrence | "";
  recurrenceEndsOn: string;
  notify: boolean;
  notifyDays: string;
  recipients: string; // separados por coma o salto de línea
};

export const parseRecipients = (s: string) => s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);

/** HU-37, 39, 40, 41, 42, 47, 51. Devuelve errores por campo o el ExpenseInput listo para el servicio. */
export function parseExpenseForm(v: ExpenseFormValues): { errors: FieldErrors; input?: Omit<ExpenseInput, "attachment"> } {
  const errors: FieldErrors = {};
  if (isBlank(v.concept)) errors.concept = MSG.required;
  if (isBlank(v.categoryId)) errors.categoryId = "Seleccione una categoría.";
  const amount = parseNumber(v.amount);
  if (isBlank(v.amount)) errors.amount = MSG.required;
  else if (amount === null || amount <= 0) errors.amount = MSG.amount;
  if (isBlank(v.dueDate)) errors.dueDate = MSG.required;
  else if (!isValidDate(v.dueDate)) errors.dueDate = MSG.date;
  if (v.recurring) {
    if (!v.recurrence) errors.recurrence = "Seleccione la frecuencia.";
    if (v.recurrenceEndsOn) {
      if (!isValidDate(v.recurrenceEndsOn)) errors.recurrenceEndsOn = MSG.date;
      else if (isValidDate(v.dueDate) && v.recurrenceEndsOn < v.dueDate) errors.recurrenceEndsOn = "La fecha de fin no puede ser anterior al vencimiento.";
    }
  }
  let notifyDays: number | null = null;
  if (v.notify) {
    const n = parseNumber(v.notifyDays);
    if (isBlank(v.notifyDays)) errors.notifyDays = MSG.required;
    else if (n === null || !Number.isInteger(n) || n < 0 || n > 365) errors.notifyDays = "Indique un número entero de días entre 0 y 365.";
    else notifyDays = n;
  }
  const recipients = parseRecipients(v.recipients);
  if (recipients.some((r) => !isEmail(r))) errors.recipients = "Hay correos con formato inválido.";
  if (Object.keys(errors).length) return { errors };
  return {
    errors,
    input: {
      concept: v.concept.trim(),
      categoryId: v.categoryId,
      kind: v.kind,
      estimatedAmount: amount!,
      dueDate: v.dueDate as ISODate,
      referenceNumber: v.referenceNumber.trim() || undefined,
      notes: v.notes.trim() || undefined,
      recurrence: v.recurring ? (v.recurrence as Recurrence) : "NONE",
      recurrenceEndsOn: v.recurring && v.recurrenceEndsOn ? (v.recurrenceEndsOn as ISODate) : undefined,
      notifyDaysBefore: v.notify ? notifyDays : null,
      extraRecipients: recipients,
    },
  };
}

/** HU-53: monto y fecha del pago. */
export function parsePaymentForm(v: { paidAt: string; amount: string }): { errors: FieldErrors; paidAt?: ISODate; amount?: number } {
  const errors: FieldErrors = {};
  const amount = parseNumber(v.amount);
  if (isBlank(v.amount)) errors.amount = MSG.required;
  else if (amount === null || amount <= 0) errors.amount = MSG.amount;
  if (isBlank(v.paidAt)) errors.paidAt = MSG.required;
  else if (!isValidDate(v.paidAt)) errors.paidAt = MSG.date;
  return Object.keys(errors).length ? { errors } : { errors, paidAt: v.paidAt as ISODate, amount: amount! };
}

export function validateCategory(name: string): FieldErrors {
  return isBlank(name) ? { name: "El nombre de la categoría es obligatorio." } : {};
}
