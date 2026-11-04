import type { ISODate } from "@/lib/format";

export type Attachment = { name: string; size: number; uploadedAt: string };

export type ExpenseCategory = { id: string; name: string; description?: string; active: boolean };
export type CategoryWithCount = ExpenseCategory & { expenseCount: number };

export type ExpenseKind = "PAYMENT" | "PERMIT";
export const EXPENSE_KIND_LABEL: Record<ExpenseKind, string> = { PAYMENT: "Pago / obligación", PERMIT: "Permiso (sanitario o comercial)" };

export type Recurrence = "NONE" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "BIMONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY";
export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  NONE: "Gasto único",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
  BIMONTHLY: "Bimestral",
  QUARTERLY: "Trimestral",
  SEMIANNUAL: "Semestral",
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

/** Igual que el modelo ExpenseDue de Prisma. */
export type ExpenseDue = {
  id: string;
  expenseId: string;
  dueDate: ISODate;
  estimatedAmount: number;
  paidAt?: ISODate;
  paidAmount?: number;
  receipt?: Attachment;
};

export type DueStatus = "PENDING" | "OVERDUE" | "PAID";
export const DUE_STATUS_LABEL: Record<DueStatus, string> = { PENDING: "Pendiente", OVERDUE: "Vencido", PAID: "Pagado" };

export type ExpenseHistoryEntry = { id: string; expenseId: string; at: string; actorName: string; action: string; detail: string };

/** Fila de listado: un vencimiento con los datos de su gasto. */
export type DueRow = {
  due: ExpenseDue;
  expense: Expense;
  categoryName: string;
  status: DueStatus;
  /** Días hasta el vencimiento (negativo si ya venció). */
  daysToDue: number;
};

export type DueDetail = DueRow & { history: ExpenseHistoryEntry[]; nextDue?: ExpenseDue };

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
