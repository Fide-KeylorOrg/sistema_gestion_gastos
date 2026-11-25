import assert from "node:assert/strict";
import { test } from "node:test";
import { claimDeadline, monthsBetween, settlement, vacationDaysOnExit, vacationEligibleDate, vacationScheduleDeadline, aguinaldo, averageMonthlySalary, noticeDays, noticePay, severanceDays, severancePay, vacationPay, vacationPayOnExit } from "./benefits";

test("aguinaldo: María, full period (MTSS example 1)", () => {
  assert.equal(aguinaldo([250_000, ...Array(11).fill(270_000)]), 268_333.33);
});

test("aguinaldo: Juan, partial period (MTSS example 2)", () => {
  assert.equal(aguinaldo([...Array(3).fill(250_000), ...Array(5).fill(260_000)]), 170_833.33);
});

test("vacations: monthly and biweekly pay 14 days, hourly 12 of 6", () => {
  assert.equal(vacationPay(300_000, "MONTHLY"), 140_000);
  assert.equal(vacationPay(300_000, "BIWEEKLY"), 140_000);
  assert.equal(vacationPay(60_000, "HOURLY"), 120_000);
});

test("vacations on exit: one day per month worked", () => {
  assert.equal(vacationPayOnExit(300_000, 6), 60_000);
});

test("average monthly salary: last months of work / months counted", () => {
  assert.equal(averageMonthlySalary([300_000, 300_000, 330_000]), 310_000);
});

test("preaviso: days by tenure and money (month from 1 year)", () => {
  assert.deepEqual([2, 3, 5, 6, 11, 12].map(noticeDays), [0, 7, 7, 15, 15, 30]);
  assert.equal(noticePay(300_000, "MONTHLY", 4), 70_000);
  assert.equal(noticePay(260_000, "HOURLY", 12), 260_000);
  assert.equal(noticePay(260_000, "HOURLY", 4), 70_000);
});

test("cesantía: short tenures", () => {
  assert.deepEqual([2, 3, 6, 7, 11].map(severanceDays), [0, 7, 7, 14, 14]);
});

test("cesantía: table by year, fraction over 6 months counts, cap of the last 8 years", () => {
  assert.equal(severanceDays(12), 19.5);
  assert.equal(severanceDays(18), 19.5); // 6 months exactly is not over 6
  assert.equal(severanceDays(19), 39.5); // 1 year + 7 months -> years 1 and 2
  assert.equal(severanceDays(36), 19.5 + 20 + 20.5);
  assert.equal(severanceDays(10 * 12), 20.5 + 21 + 21.24 + 21.5 + 22 + 22 + 22 + 21.5); // years 3-10
  assert.equal(severanceDays(20 * 12), 8 * 20);
  assert.equal(severancePay(300_000, "MONTHLY", 36), 600_000);
});

test("monthsBetween counts 30-day months, end date included", () => {
  assert.equal(monthsBetween("2026-01-01", "2026-06-30"), 6);
  assert.ok(monthsBetween("2026-01-01", "2026-07-01") > 6);
  assert.equal(monthsBetween("2026-01-15", "2026-02-14"), 1);
  assert.equal(monthsBetween("2026-01-01", "2026-01-31"), 1);
});

test("vacation days on exit: a day per month under 50 weeks, the unused balance after", () => {
  assert.equal(vacationDaysOnExit(7.5, 9), 7);
  assert.equal(vacationDaysOnExit(11.5, 9), 9);
});

const base = { monthsWorked: 24, avgMonthly: 300_000, payment: "MONTHLY" as const, vacationDays: 6, aguinaldoEarnings: [300_000, 300_000] };

test("settlement: dismissal with liability adds preaviso and cesantía", () => {
  const rows = settlement({ ...base, dismissedWithLiability: true });
  assert.deepEqual(rows.map((r) => [r.concept, r.amount]), [["Preaviso", 300_000], ["Cesantía", 395_000], ["Vacaciones proporcionales", 60_000], ["Aguinaldo proporcional", 50_000]]);
});

test("settlement: any other exit only pays vacation and aguinaldo", () => {
  assert.deepEqual(settlement({ ...base, dismissedWithLiability: false }).map((r) => r.concept), ["Vacaciones proporcionales", "Aguinaldo proporcional"]);
});

test("vacation dates: 50 weeks plus incapacity days, then 15 weeks to schedule", () => {
  assert.equal(vacationEligibleDate("2026-01-01"), "2026-12-17");
  assert.equal(vacationEligibleDate("2026-01-01", 10), "2026-12-27");
  assert.equal(vacationScheduleDeadline("2026-12-17"), "2027-04-01");
});

test("claim deadlines", () => {
  assert.equal(claimDeadline("AGUINALDO", "2026-11-24"), "2027-11-24");
  assert.equal(claimDeadline("SEVERANCE", "2028-02-29"), "2029-02-28");
  assert.equal(claimDeadline("NOTICE", "2026-11-24"), "2026-12-24");
});
