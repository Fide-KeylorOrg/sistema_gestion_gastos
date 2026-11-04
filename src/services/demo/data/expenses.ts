import type { Expense, ExpenseCategory, ExpenseDue, ExpenseHistoryEntry } from "@/features/expenses/types";

export const demoCategories = (): ExpenseCategory[] => [
  { id: "cat-serv", name: "Servicios públicos", description: "Electricidad, agua y telecomunicaciones", active: true },
  { id: "cat-mant", name: "Mantenimiento y reparación", description: "Cámaras de frío, equipos y local", active: true },
  { id: "cat-sumi", name: "Suministros y desinfección", description: "Insumos de oficina y limpieza", active: true },
  { id: "cat-segu", name: "Seguros", description: "Pólizas del local y riesgos del trabajo", active: true },
  { id: "cat-perm", name: "Permisos e inspecciones", description: "Permisos sanitarios y comerciales", active: true },
  { id: "cat-ccss", name: "Obligaciones CCSS", description: "Cargas sociales patronales", active: true },
  { id: "cat-vieja", name: "Alquileres (en desuso)", active: false },
];

type Seed = { id: string; concept: string; cat: string; kind?: Expense["kind"]; amount: number; ref?: string; notes?: string; rec: Expense["recurrence"]; notify: number | null; extra?: string[]; due: string; hist?: [string, string, number][] };

const SEEDS: Seed[] = [
  { id: "e1", concept: "Recibo de electricidad CNFL", cat: "cat-serv", amount: 720000, ref: "CNFL-0451-22", rec: "MONTHLY", notify: 7, due: "2026-11-18", hist: [["2026-08-18", "2026-08-17", 905000], ["2026-09-18", "2026-09-16", 920000], ["2026-10-18", "2026-10-16", 980000]] },
  { id: "e2", concept: "Servicio de agua AyA", cat: "cat-serv", amount: 85000, rec: "MONTHLY", notify: 5, due: "2026-11-12", hist: [["2026-09-12", "2026-09-10", 82000], ["2026-10-12", "2026-10-12", 88000]] },
  { id: "e3", concept: "Internet y telefonía", cat: "cat-serv", amount: 45000, rec: "MONTHLY", notify: 3, due: "2026-11-07", hist: [["2026-10-07", "2026-10-06", 45000]] },
  { id: "e4", concept: "Factura de mantenimiento cámaras de frío", cat: "cat-mant", amount: 385000, ref: "FAC-2026-0187", notes: "Mantenimiento preventivo trimestral de cámaras de frío (carnicería).", rec: "NONE", notify: 7, extra: ["mantenimiento@frio-sur.cr"], due: "2026-11-05", hist: [] },
  { id: "e5", concept: "Póliza de riesgos del trabajo INS", cat: "cat-segu", amount: 245000, ref: "POL-RT-7782", rec: "MONTHLY", notify: 7, due: "2026-10-20", hist: [["2026-09-20", "2026-09-18", 245000]] },
  { id: "e6", concept: "Declaración y cargas sociales CCSS", cat: "cat-ccss", amount: 1150400, notes: "Planilla patronal SICERE correspondiente a octubre 2026.", rec: "MONTHLY", notify: 7, due: "2026-11-15", hist: [["2026-09-15", "2026-09-14", 1210000], ["2026-10-15", "2026-10-14", 1190000]] },
  { id: "e7", concept: "Suministros de desinfección", cat: "cat-sumi", amount: 150000, rec: "MONTHLY", notify: null, due: "2026-11-25", hist: [["2026-09-25", "2026-09-25", 140000], ["2026-10-25", "2026-10-24", 135000]] },
  { id: "e8", concept: "Permiso sanitario de funcionamiento", cat: "cat-perm", kind: "PERMIT", amount: 45000, ref: "MS-PSF-2025-3391", notes: "Ministerio de Salud, área carnicería.", rec: "YEARLY", notify: 30, due: "2026-10-25", hist: [] },
  { id: "e9", concept: "Patente comercial municipal", cat: "cat-perm", kind: "PERMIT", amount: 180000, rec: "QUARTERLY", notify: 14, due: "2026-11-09", hist: [["2026-08-09", "2026-08-05", 180000]] },
  { id: "e10", concept: "Seguro de incendio del local", cat: "cat-segu", amount: 960000, ref: "INS-INC-5520", rec: "YEARLY", notify: 30, due: "2027-02-10", hist: [["2026-02-10", "2026-02-06", 940000]] },
  { id: "e11", concept: "Recarga de extintores", cat: "cat-mant", amount: 62000, rec: "YEARLY", notify: 30, due: "2026-12-05", hist: [] },
];

export const demoExpenses = (): Expense[] =>
  SEEDS.map((s) => ({
    id: s.id, concept: s.concept, categoryId: s.cat, kind: s.kind ?? "PAYMENT", estimatedAmount: s.amount, referenceNumber: s.ref, notes: s.notes,
    recurrence: s.rec, notifyDaysBefore: s.notify, extraRecipients: s.extra ?? [],
  }));

export const demoDues = (): ExpenseDue[] =>
  SEEDS.flatMap((s) => [
    ...(s.hist ?? []).map(([dueDate, paidAt, paidAmount], i): ExpenseDue => ({
      id: `${s.id}-h${i}`, expenseId: s.id, dueDate, estimatedAmount: s.amount, paidAt, paidAmount,
      receipt: i === (s.hist!.length - 1) ? { name: `comprobante-${s.id}-${paidAt}.pdf`, size: 184320, uploadedAt: `${paidAt}T10:00:00-06:00` } : undefined,
    })),
    { id: `${s.id}-open`, expenseId: s.id, dueDate: s.due, estimatedAmount: s.amount } satisfies ExpenseDue,
  ]);

export const demoExpenseHistory = (): ExpenseHistoryEntry[] => [
  { id: "eh-1", expenseId: "e4", at: "2026-10-28T10:15:00-06:00", actorName: "Damaris Salas", action: "Registro", detail: "Gasto registrado en estado pendiente." },
  { id: "eh-2", expenseId: "e1", at: "2026-10-16T09:00:00-06:00", actorName: "Damaris Salas", action: "Pago registrado", detail: "Pagado ₡980 000,00 (estimado ₡720 000,00)." },
  { id: "eh-3", expenseId: "e1", at: "2026-10-16T09:20:00-06:00", actorName: "Damaris Salas", action: "Pago revertido", detail: "Marcado por error; el gasto volvió a pendiente." },
  { id: "eh-4", expenseId: "e1", at: "2026-10-16T09:30:00-06:00", actorName: "Damaris Salas", action: "Pago registrado", detail: "Pagado ₡980 000,00." },
];
