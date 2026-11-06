import { fail, ok } from "@/lib/result";
import { diffDays, formatCRC } from "@/lib/format";
import { isValidDate } from "@/lib/validation";
import type { ExpensesService } from "../contracts";
import type { DueRow, Expense, ExpenseDue } from "@/features/expenses/types";
import { dueStatus } from "@/features/expenses/status";
import { nextDueDate } from "@/features/expenses/recurrence";
import { parseExpenseForm, validateCategory } from "@/features/expenses/validation";
import { db, done, expenseHistory, nowISO, uid } from "./store";
import { DEMO_TODAY } from "./clock";

const expenseOf = (id: string) => db.expenses.find((e) => e.id === id && !e.deletedAt);
const categoryName = (id: string) => db.categories.find((c) => c.id === id)?.name ?? "—";

function toRow(due: ExpenseDue): DueRow | null {
  const expense = expenseOf(due.expenseId);
  if (!expense) return null;
  return { due, expense, categoryName: categoryName(expense.categoryId), status: dueStatus(due, DEMO_TODAY), daysToDue: diffDays(DEMO_TODAY, due.dueDate) };
}

const openDueOf = (expenseId: string) => db.dues.filter((d) => d.expenseId === expenseId && !d.paidAt).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

export const demoExpensesService: ExpensesService = {
  async listDues(f) {
    const q = f.search?.trim().toLowerCase();
    const rows = db.dues.map(toRow).filter((r): r is DueRow => !!r);
    return rows
      .filter((r) => (f.tab === "active" ? !r.due.paidAt : !!r.due.paidAt))
      .filter((r) => !q || r.expense.concept.toLowerCase().includes(q) || (r.expense.referenceNumber ?? "").toLowerCase().includes(q))
      .filter((r) => !f.categoryId || r.expense.categoryId === f.categoryId)
      .filter((r) => !f.status || r.status === f.status)
      .filter((r) => !f.from || r.due.dueDate >= f.from)
      .filter((r) => !f.to || r.due.dueDate <= f.to)
      .filter((r) => f.periodYear === undefined || (+r.due.dueDate.slice(0, 4) === f.periodYear && (f.periodMonth === undefined || +r.due.dueDate.slice(5, 7) - 1 === f.periodMonth)))
      .sort((a, b) => (f.tab === "active" ? a.due.dueDate.localeCompare(b.due.dueDate) : b.due.dueDate.localeCompare(a.due.dueDate)));
  },

  async getDue(dueId) {
    const due = db.dues.find((d) => d.id === dueId);
    const row = due && toRow(due);
    if (!row) return null;
    const history = db.expenseHistory.filter((h) => h.expenseId === row.expense.id).sort((a, b) => b.at.localeCompare(a.at));
    const open = openDueOf(row.expense.id);
    return { ...row, history, nextDue: open && open.id !== due.id ? open : undefined };
  },

  async getExpense(expenseId) {
    const e = expenseOf(expenseId);
    if (!e) return null;
    const due = openDueOf(expenseId) ?? db.dues.filter((d) => d.expenseId === expenseId).sort((a, b) => b.dueDate.localeCompare(a.dueDate))[0];
    return { expense: { ...e, dueDate: due.dueDate }, dueId: due.id };
  },

  async create(input) {
    const form = parseExpenseForm({
      concept: input.concept, categoryId: input.categoryId, kind: input.kind, amount: String(input.estimatedAmount), dueDate: input.dueDate,
      referenceNumber: input.referenceNumber ?? "", notes: input.notes ?? "", recurring: input.recurrence !== "NONE", recurrence: input.recurrence,
      recurrenceEndsOn: input.recurrenceEndsOn ?? "", notify: input.notifyDaysBefore !== null, notifyDays: String(input.notifyDaysBefore ?? ""), recipients: input.extraRecipients.join(","),
    });
    if (form.errors && Object.keys(form.errors).length) return fail("VALIDATION", "Revise los campos indicados.", form.errors);
    if (db.expenses.some((e) => !e.deletedAt && e.concept.toLowerCase() === input.concept.trim().toLowerCase() && db.dues.some((d) => d.expenseId === e.id && d.dueDate === input.dueDate)))
      return fail("DUPLICATE", "Ya existe un gasto con el mismo concepto y fecha de vencimiento.", { concept: "Ya existe un gasto con este concepto y vencimiento." });
    const expense: Expense = { ...input, id: uid("e"), concept: input.concept.trim() };
    db.expenses.push(expense);
    const due: ExpenseDue = { id: uid("due"), expenseId: expense.id, dueDate: input.dueDate, estimatedAmount: input.estimatedAmount };
    db.dues.push(due);
    expenseHistory(expense.id, "Registro", "Gasto registrado en estado pendiente.");
    done();
    return ok({ dueId: due.id });
  },

  async update(expenseId, input) {
    const e = expenseOf(expenseId);
    if (!e) return fail("NOT_FOUND", "El gasto no existe.");
    if (!input.concept.trim() || !input.categoryId || !(input.estimatedAmount > 0) || !isValidDate(input.dueDate)) return fail("VALIDATION", "Revise los campos indicados.");
    const { ...rest } = input;
    Object.assign(e, { ...rest, concept: input.concept.trim(), attachment: input.attachment ?? e.attachment });
    const open = openDueOf(expenseId);
    if (open) {
      open.dueDate = input.dueDate; // HU-50 escenario 3: el calendario lee esta fecha
      open.estimatedAmount = input.estimatedAmount;
    }
    expenseHistory(expenseId, "Edición", "Se actualizaron los datos del gasto.");
    done();
    return ok({ dueId: (open ?? db.dues.find((d) => d.expenseId === expenseId)!).id });
  },

  async remove(expenseId) {
    const e = expenseOf(expenseId);
    if (!e) return fail("NOT_FOUND", "El gasto no existe.");
    e.deletedAt = nowISO(); // borrado lógico (el modelo tiene deletedAt)
    done();
    return ok(undefined);
  },

  async markPaid(dueId, input) {
    const due = db.dues.find((d) => d.id === dueId);
    const e = due && expenseOf(due.expenseId);
    if (!due || !e) return fail("NOT_FOUND", "El gasto no existe.");
    if (due.paidAt) return fail("CONFLICT", "Este vencimiento ya está pagado.");
    if (!(input.paidAmount > 0)) return fail("VALIDATION", "Ingrese un monto mayor que cero.", { amount: "Ingrese un monto mayor que cero." });
    if (!isValidDate(input.paidAt)) return fail("VALIDATION", "Fecha inválida.", { paidAt: "Ingrese una fecha válida." });
    due.paidAt = input.paidAt;
    due.paidAmount = input.paidAmount;
    due.receipt = input.receipt;
    expenseHistory(e.id, "Pago registrado", `Pagado ${formatCRC(input.paidAmount)} (estimado ${formatCRC(due.estimatedAmount)}).`);
    let nextDueId: string | undefined;
    const next = nextDueDate(due.dueDate, e.recurrence);
    if (next && (!e.recurrenceEndsOn || next <= e.recurrenceEndsOn) && !db.dues.some((d) => d.expenseId === e.id && d.dueDate === next)) {
      const nd: ExpenseDue = { id: uid("due"), expenseId: e.id, dueDate: next, estimatedAmount: e.estimatedAmount };
      db.dues.push(nd);
      nextDueId = nd.id;
    }
    done();
    return ok({ nextDueId });
  },

  async revertPayment(dueId) {
    const due = db.dues.find((d) => d.id === dueId);
    const e = due && expenseOf(due.expenseId);
    if (!due || !e) return fail("NOT_FOUND", "El gasto no existe.");
    if (!due.paidAt) return fail("CONFLICT", "Este vencimiento no está pagado.");
    due.paidAt = undefined;
    due.paidAmount = undefined;
    due.receipt = undefined;
    // Si el pago había generado el siguiente vencimiento y nadie lo ha tocado, se retira para no duplicarlo.
    const next = nextDueDate(due.dueDate, e.recurrence);
    const idx = db.dues.findIndex((d) => d.expenseId === e.id && d.dueDate === next && !d.paidAt);
    if (idx >= 0) db.dues.splice(idx, 1);
    expenseHistory(e.id, "Pago revertido", "El gasto volvió a pendiente y se reactivaron los recordatorios.");
    done();
    return ok(undefined);
  },

  async finalizeRecurrence(expenseId, endsOn) {
    const e = expenseOf(expenseId);
    if (!e) return fail("NOT_FOUND", "El gasto no existe.");
    if (!isValidDate(endsOn)) return fail("VALIDATION", "Fecha inválida.");
    e.recurrenceEndsOn = endsOn;
    // Se conservan los vencimientos pendientes anteriores a la fecha de fin; los posteriores sin pagar se retiran.
    db.dues = db.dues.filter((d) => !(d.expenseId === expenseId && !d.paidAt && d.dueDate > endsOn));
    expenseHistory(expenseId, "Recurrencia finalizada", `No se generarán vencimientos después del ${endsOn.split("-").reverse().join("/")}.`);
    done();
    return ok(undefined);
  },

  async listCategories() {
    return db.categories
      .map((c) => ({ ...c, expenseCount: db.expenses.filter((e) => e.categoryId === c.id && !e.deletedAt).length }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
  async createCategory(input) {
    const errors = validateCategory(input.name);
    if (Object.keys(errors).length) return fail("VALIDATION", "Revise los campos indicados.", errors);
    if (db.categories.some((c) => c.name.toLowerCase() === input.name.trim().toLowerCase())) return fail("DUPLICATE", "La categoría ya existe.", { name: "La categoría ya existe." });
    const c = { id: uid("cat"), name: input.name.trim(), description: input.description?.trim() || undefined, active: true };
    db.categories.push(c);
    done();
    return ok(c);
  },
  async updateCategory(id, input) {
    const c = db.categories.find((x) => x.id === id);
    if (!c) return fail("NOT_FOUND", "La categoría no existe.");
    const errors = validateCategory(input.name);
    if (Object.keys(errors).length) return fail("VALIDATION", "Revise los campos indicados.", errors);
    if (db.categories.some((x) => x.id !== id && x.name.toLowerCase() === input.name.trim().toLowerCase())) return fail("DUPLICATE", "La categoría ya existe.", { name: "La categoría ya existe." });
    c.name = input.name.trim();
    c.description = input.description?.trim() || undefined;
    if (input.active !== undefined) c.active = input.active;
    done();
    return ok(c);
  },

  async getNotificationSettings() {
    return { globalRecipients: [...db.notification.globalRecipients] };
  },
  async updateNotificationSettings(input) {
    db.notification = { globalRecipients: [...input.globalRecipients] };
    done();
    return ok(undefined);
  },
};
