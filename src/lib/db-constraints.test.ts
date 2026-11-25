import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { db } from "./db";

// Checks the CHECK/EXCLUDE constraints added in the migrations. Runs against gastos_test.
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const period = (start: string, end: string) => ({ periodStart: day(start), periodEnd: day(end), payDate: day(end) });

after(() => db.$disconnect());

test("payroll periods cannot overlap or end before they start, and only closed payrolls can be paid", async () => {
  const payroll = await db.payroll.create({ data: period("2031-01-01", "2031-01-15") });
  try {
    await assert.rejects(db.payroll.create({ data: period("2031-01-15", "2031-01-31") }));
    await assert.rejects(db.payroll.create({ data: period("2031-02-15", "2031-02-01") }));
    await assert.rejects(db.payroll.update({ where: { id: payroll.id }, data: { paidAt: day("2031-01-16") } }));
    await db.payroll.update({ where: { id: payroll.id }, data: { closedAt: new Date(), paidAt: day("2031-01-16") } });
    const next = await db.payroll.create({ data: period("2031-01-16", "2031-01-31") });
    await db.payroll.delete({ where: { id: next.id } });
  } finally {
    await db.payroll.delete({ where: { id: payroll.id } });
  }
});

test("a due has at most one active payment; a voided one is kept with its reason and the due can be paid again", async () => {
  const category = await db.expenseCategory.create({ data: { name: `test-${randomUUID()}` } });
  const expense = await db.expense.create({ data: { concept: "Agua", categoryId: category.id, estimatedAmount: 15000 } });
  const due = await db.expenseDue.create({ data: { expenseId: expense.id, dueDate: day("2031-01-10"), estimatedAmount: 15000 } });
  const pay = (amount: number) => db.expensePayment.create({ data: { dueId: due.id, paidAt: day("2031-01-09"), amount } });
  try {
    await assert.rejects(pay(0));
    const first = await pay(14800);
    await assert.rejects(pay(14800));
    await assert.rejects(db.expensePayment.update({ where: { id: first.id }, data: { voidedAt: new Date() } }));
    await db.expensePayment.update({ where: { id: first.id }, data: { voidedAt: new Date(), voidReason: "Registrado por error" } });
    await pay(15200);
    assert.equal(await db.expensePayment.count({ where: { dueId: due.id } }), 2);

    await assert.rejects(db.expense.create({ data: { concept: "Luz", categoryId: category.id, estimatedAmount: -1 } }));
    await assert.rejects(db.expense.update({ where: { id: expense.id }, data: { notifyDaysBefore: 11 } }));
    await assert.rejects(db.expense.update({ where: { id: expense.id }, data: { notifyDaysBefore: 0 } }));
  } finally {
    await db.expensePayment.deleteMany({ where: { dueId: due.id } });
    await db.expenseDue.delete({ where: { id: due.id } });
    await db.expense.delete({ where: { id: expense.id } });
    await db.expenseCategory.delete({ where: { id: category.id } });
  }
});
