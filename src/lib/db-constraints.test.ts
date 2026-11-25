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

test("an employee's active vacations and sick leaves never overlap, and only sick leave has a sick-leave type", async () => {
  const employee = await db.employee.create({
    data: { idType: "NATIONAL_ID", idNumber: randomUUID(), firstName: "Ana", lastName1: "Mora", birthDate: day("1990-05-01"), position: "Cajera", hireDate: day("2025-01-06") },
  });
  const leave = (kind: "VACATION" | "SICK_LEAVE", start: string, end: string, extra = {}) =>
    db.leave.create({ data: { employeeId: employee.id, kind, startDate: day(start), endDate: day(end), days: 3, ...extra } });
  try {
    const vacation = await leave("VACATION", "2031-03-02", "2031-03-04");
    await assert.rejects(leave("SICK_LEAVE", "2031-03-04", "2031-03-06", { sickLeaveType: "CCSS" }));
    await assert.rejects(leave("SICK_LEAVE", "2031-03-10", "2031-03-12"));
    await assert.rejects(leave("VACATION", "2031-03-10", "2031-03-12", { sickLeaveType: "CCSS" }));
    await db.leave.update({ where: { id: vacation.id }, data: { voidedAt: new Date() } });
    await leave("SICK_LEAVE", "2031-03-04", "2031-03-06", { sickLeaveType: "CCSS" });
  } finally {
    await db.leave.deleteMany({ where: { employeeId: employee.id } });
    await db.employee.delete({ where: { id: employee.id } });
  }
});

test("an inactive employee needs the date and reason; salaries are positive and one per effective date", async () => {
  const employee = await db.employee.create({
    data: { idType: "NATIONAL_ID", idNumber: randomUUID(), firstName: "Luis", lastName1: "Soto", birthDate: day("1992-01-01"), position: "Cajero", hireDate: day("2025-01-06") },
  });
  const salary = (from: string, baseSalary: number) => db.employeeSalary.create({ data: { employeeId: employee.id, salaryBasis: "MONTHLY", baseSalary, effectiveFrom: day(from) } });
  try {
    await assert.rejects(db.employee.update({ where: { id: employee.id }, data: { active: false } }));
    await db.employee.update({ where: { id: employee.id }, data: { active: false, statusChangedAt: day("2026-03-31"), statusReason: "Renuncia" } });
    await salary("2025-01-06", 450000);
    await salary("2026-07-01", 480000); // scheduled ahead (HU-18)
    await assert.rejects(salary("2026-07-01", 490000));
    await assert.rejects(salary("2026-08-01", 0));
  } finally {
    await db.employeeSalary.deleteMany({ where: { employeeId: employee.id } });
    await db.employee.delete({ where: { id: employee.id } });
  }
});

test("rates stay within 0-100% with no overlapping periods, and income-tax brackets don't overlap", async () => {
  const rate = (from: string, to: string, percent = 1) =>
    db.payrollRate.create({ data: { scope: "EMPLOYER", code: "INS", percent, effectiveFrom: day(from), effectiveTo: day(to), source: "test" } });
  const table = await db.incomeTaxTable.create({ data: { effectiveFrom: day("2091-01-01"), effectiveTo: day("2091-12-31"), source: "test" } });
  const bracket = (lowerBound: number, upperBound: number | null) => db.incomeTaxBracket.create({ data: { tableId: table.id, lowerBound, upperBound, percent: 10 } });
  try {
    await rate("2091-01-01", "2091-12-31");
    await assert.rejects(rate("2091-06-01", "2092-12-31"));
    await assert.rejects(rate("2093-01-01", "2093-12-31", 101));
    await rate("2092-01-01", "2092-12-31");

    await bracket(0, 900000);
    await bracket(900000, null); // touching bounds are fine: [0, 900000) and [900000, ∞)
    await assert.rejects(bracket(500000, 1000000));
  } finally {
    await db.payrollRate.deleteMany({ where: { code: "INS", effectiveFrom: { gte: day("2091-01-01") } } });
    await db.incomeTaxTable.delete({ where: { id: table.id } });
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
