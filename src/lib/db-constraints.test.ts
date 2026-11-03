import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { db } from "./db";

// Checks the CHECK/EXCLUDE constraints from the add_payroll_and_expenses migration. Runs against gastos_test.
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

after(() => db.$disconnect());

test("payroll periods cannot overlap or end before they start, and only closed payrolls can be paid", async () => {
  const payroll = await db.payroll.create({ data: { periodStart: day("2031-01-01"), periodEnd: day("2031-01-15") } });
  try {
    await assert.rejects(db.payroll.create({ data: { periodStart: day("2031-01-15"), periodEnd: day("2031-01-31") } }));
    await assert.rejects(db.payroll.create({ data: { periodStart: day("2031-02-15"), periodEnd: day("2031-02-01") } }));
    await assert.rejects(db.payroll.update({ where: { id: payroll.id }, data: { paidAt: day("2031-01-16") } }));
    await db.payroll.update({ where: { id: payroll.id }, data: { closedAt: new Date(), paidAt: day("2031-01-16") } });
    const next = await db.payroll.create({ data: { periodStart: day("2031-01-16"), periodEnd: day("2031-01-31") } });
    await db.payroll.delete({ where: { id: next.id } });
  } finally {
    await db.payroll.delete({ where: { id: payroll.id } });
  }
});

test("a due's payment date and amount are set together, and the amount is positive", async () => {
  const category = await db.expenseCategory.create({ data: { name: `test-${randomUUID()}` } });
  const expense = await db.expense.create({ data: { concept: "Agua", categoryId: category.id, estimatedAmount: 15000 } });
  const due = await db.expenseDue.create({ data: { expenseId: expense.id, dueDate: day("2031-01-10"), estimatedAmount: 15000 } });
  try {
    await assert.rejects(db.expenseDue.update({ where: { id: due.id }, data: { paidAt: day("2031-01-09") } }));
    await assert.rejects(db.expenseDue.update({ where: { id: due.id }, data: { paidAt: day("2031-01-09"), paidAmount: 0 } }));
    await db.expenseDue.update({ where: { id: due.id }, data: { paidAt: day("2031-01-09"), paidAmount: 14800 } });
    await assert.rejects(db.expense.create({ data: { concept: "Luz", categoryId: category.id, estimatedAmount: -1 } }));
  } finally {
    await db.expenseDue.delete({ where: { id: due.id } });
    await db.expense.delete({ where: { id: expense.id } });
    await db.expenseCategory.delete({ where: { id: category.id } });
  }
});
