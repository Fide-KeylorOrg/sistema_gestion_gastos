import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays } from "./format";
import { CCSS_RATES, employeeCharges, employeeRateOn, employerCharges, employerRateOn, hasCcssRates, INCOME_TAX, incomeTax } from "./payroll-rates";

test("every table is ordered, with no gaps or overlaps", () => {
  for (const table of [CCSS_RATES, INCOME_TAX]) {
    table.forEach((e, i) => {
      assert.ok(e.from <= e.to, `${e.from} is after ${e.to}`);
      if (i > 0) assert.equal(e.from, addDays(table[i - 1].to, 1), "gap or overlap between entries");
    });
  }
});

test("CCSS totals follow the year: 2025 and 2026", () => {
  assert.equal(employerRateOn("2025-12-31"), 26.67);
  assert.equal(employeeRateOn("2025-12-31"), 10.67);
  assert.equal(employerRateOn("2026-01-01"), 26.83);
  assert.equal(employeeRateOn("2026-01-01"), 10.83);
  assert.equal(employerRateOn("2028-12-31"), 26.83);
});

test("charges on ₡1.500.000 in 2026 match the published example", () => {
  assert.deepEqual(employeeCharges(1_500_000, "2026-06-15"), { SEM: 82_500, IVM: 64_950, BANCO_POPULAR: 15_000, total: 162_450 });
  assert.equal(employerCharges(1_500_000, "2026-06-15"), 402_450);
});

test("the same salary in 2025 uses the old IVM", () => {
  assert.equal(employeeCharges(1_500_000, "2025-06-15").total, 160_050);
});

test("dates without loaded rates fail loudly instead of reusing old ones", () => {
  assert.equal(hasCcssRates("2029-01-01"), false);
  assert.throws(() => employeeCharges(1_000_000, "2029-01-01"), /No hay porcentajes/);
  assert.throws(() => employerCharges(1_000_000, "2022-12-31"), /No hay porcentajes/);
  assert.throws(() => incomeTax(1_000_000, "2027-01-01"), /No hay tramos/);
});

test("income tax: exempt up to ₡918.000, progressive above", () => {
  const d = "2026-06-15";
  assert.equal(incomeTax(900_000, d), 0);
  assert.equal(incomeTax(1_000_000, d), 8_200);
  assert.equal(incomeTax(1_500_000, d), 65_850); // 42.900 + 22.950
  assert.equal(incomeTax(5_000_000, d), 42_900 + 152_550 + 472_600 + 68_250); // all five brackets
});
