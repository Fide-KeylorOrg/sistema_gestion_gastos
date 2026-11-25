import type { ISODate } from "@/lib/format";

export type Attachment = { name: string; size: number; uploadedAt: string };

export type ExpenseCategory = { id: string; name: string; description?: string; active: boolean };
export type CategoryWithCount = ExpenseCategory & { expenseCount: number };

export type ExpenseKind = "PAYMENT" | "PERMIT";
export const EXPENSE_KIND_LABEL: Record<ExpenseKind, string> = { PAYMENT: "Pago / obligación", PERMIT: "Permiso (sanitario o comercial)" };

export type Recurrence = "NONE" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  NONE: "Gasto único",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
  QUARTERLY: "Trimestral",
  YEARLY: "Anual",
};

/** Igual que el modelo Expense de Prisma. */
export type Expense = {
  id: string;
  concept: string;
  categoryId: string;
  kind: ExpenseKind;
  estimatedAmount: number;
  referenceNumber?: string;
  notes?: string;
  recurrence: Recurrence;
  recurrenceEndsOn?: ISODate;
  notifyDaysBefore: number | null; // null = avisos desactivados
  extraRecipients: string[];
  attachment?: Attachment;
  deletedAt?: string;
};

/** Igual que el modelo ExpenseDue de Prisma. El pago vive en ExpensePayment. */
export type ExpenseDue = {
  id: string;
  expenseId: string;
  dueDate: ISODate;
  estimatedAmount: number;
  /** Pago que generó este vencimiento; al anularlo se retira el vencimiento si nadie lo tocó (HU-39). */
  generatedByPaymentId?: string;
  /** Cancelado al anular el pago que lo generó o al finalizar la recurrencia; no aparece en ninguna vista. */
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
};

/** Igual que el modelo ExpensePayment de Prisma. Un pago anulado se conserva con su motivo (HU-39). */
export type ExpensePayment = {
  id: string;
  dueId: string;
  paidAt: ISODate;
  amount: number;
  /** Aún no está en Prisma: llega con la tabla de archivos. */
  receipt?: Attachment;
  voidedAt?: string;
  voidReason?: string;
};

export type DueStatus = "PENDING" | "OVERDUE" | "PAID";
export const DUE_STATUS_LABEL: Record<DueStatus, string> = { PENDING: "Pendiente", OVERDUE: "Vencido", PAID: "Pagado" };

export type ExpenseHistoryEntry = { id: string; expenseId: string; at: string; actorName: string; action: string; detail: string };

/** Fila de listado: un vencimiento con los datos de su gasto. */
export type DueRow = {
  due: ExpenseDue;
  /** Pago vigente (no anulado), si existe. */
  payment?: ExpensePayment;
  expense: Expense;
  categoryName: string;
  status: DueStatus;
  /** Días hasta el vencimiento (negativo si ya venció). */
  daysToDue: number;
};

export type DueDetail = DueRow & { history: ExpenseHistoryEntry[]; nextDue?: ExpenseDue; voidedPayments: ExpensePayment[] };

export type DueFilters = {
  tab: "active" | "history";
  search?: string;
  categoryId?: string;
  status?: DueStatus | "";
  from?: ISODate;
  to?: ISODate;
  /** Historial por período (HU-46). */
  periodYear?: number;
  periodMonth?: number; // 0-11
};

export type ExpenseInput = {
  concept: string;
  categoryId: string;
  kind: ExpenseKind;
  estimatedAmount: number;
  dueDate: ISODate;
  referenceNumber?: string;
  notes?: string;
  recurrence: Recurrence;
  recurrenceEndsOn?: ISODate;
  notifyDaysBefore: number | null;
  extraRecipients: string[];
  attachment?: Attachment;
};

export type PaymentInput = { paidAt: ISODate; paidAmount: number; receipt?: Attachment };

export type NotificationSettings = { globalRecipients: string[] };
