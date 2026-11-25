// Social charges (CCSS) and salary income tax. Rates are versioned by date: every function takes the date
// the salary belongs to and uses the entry in force that day. See the README for how to add a new year.
import type { ISODate } from "./format";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

type Versioned = { from: ISODate; to: ISODate; source: string };

/** Entry in force on `date`; undefined if the table has none (never falls back to a stale entry). */
const find = <T extends Versioned>(table: readonly T[], date: ISODate) => table.find((e) => e.from <= date && date <= e.to);

function mustFind<T extends Versioned>(table: readonly T[], date: ISODate, what: string): T {
  const entry = find(table, date);
  if (!entry) throw new Error(`No hay ${what} cargados para ${date}. Agréguelos en src/lib/payroll-rates.ts.`);
  return entry;
}

// ---------- CCSS social charges ----------

export type CcssRates = Versioned & {
  /** Percent of the gross salary withheld from the employee. */
  employee: { SEM: number; IVM: number; BANCO_POPULAR: number };
  /**
   * Percent of the gross salary paid by the employer. Banco Popular is 0.25 collected by the CCSS plus 0.25 under
   * the LPT; INS is the CCSS reference rate for the risk policy, included in its total.
   * shortcut: employers that are not agricultural and have under 5 workers skip INA; not modelled.
   */
  employer: { SEM: number; IVM: number; ASIGNACIONES_FAMILIARES: number; IMAS: number; INA: number; BANCO_POPULAR: number; FCL: number; OPC: number; INS: number };
};

// Only the IVM has changed since 2023; everything else stays as is until a law or CCSS decision says otherwise.
const OTHER_EMPLOYER = { SEM: 9.25, ASIGNACIONES_FAMILIARES: 5, IMAS: 0.5, INA: 1.5, BANCO_POPULAR: 0.5, FCL: 1.5, OPC: 2, INS: 1 };

/** Oldest first, no gaps or overlaps (checked by the tests). */
export const CCSS_RATES: readonly CcssRates[] = [
  {
    from: "2023-01-01",
    to: "2025-12-31",
    employee: { SEM: 5.5, IVM: 4.17, BANCO_POPULAR: 1 },
    employer: { ...OTHER_EMPLOYER, IVM: 5.42 },
    source: "CCSS news 18/12/2025 (IVM until 2025-12-31); venegasnexia.com (start date and totals 26.67 / 10.67)",
  },
  {
    from: "2026-01-01",
    to: "2028-12-31",
    employee: { SEM: 5.5, IVM: 4.33, BANCO_POPULAR: 1 },
    employer: { ...OTHER_EMPLOYER, IVM: 5.58 },
    source: "CCSS employer calculator https://www.ccss.sa.cr/patronos (IVM fixed until December 2028)",
  },
];

export const ccssRatesOn = (date: ISODate) => mustFind(CCSS_RATES, date, "porcentajes de cargas sociales");
export const hasCcssRates = (date: ISODate) => !!find(CCSS_RATES, date);

const total = (rates: Record<string, number>) => round2(Object.values(rates).reduce((a, n) => a + n, 0));
export const employeeRateOn = (date: ISODate) => total(ccssRatesOn(date).employee);
export const employerRateOn = (date: ISODate) => total(ccssRatesOn(date).employer);

/** Social charges withheld from a salary. Not applied to aguinaldo or cesantía. */
export function employeeCharges(gross: number, date: ISODate) {
  const rates = ccssRatesOn(date).employee;
  const part = (pct: number) => round2((gross * pct) / 100);
  const SEM = part(rates.SEM);
  const IVM = part(rates.IVM);
  const BANCO_POPULAR = part(rates.BANCO_POPULAR);
  return { SEM, IVM, BANCO_POPULAR, total: round2(SEM + IVM + BANCO_POPULAR) };
}

export const employerCharges = (gross: number, date: ISODate) => round2((gross * employerRateOn(date)) / 100);

// ---------- Income tax on salaries ----------

export type TaxBracket = { from: number; to: number | null; percent: number };
export type IncomeTaxTable = Versioned & { brackets: TaxBracket[] };

/** Monthly brackets for salaried workers. Hacienda publishes new ones every December for the next fiscal year. */
export const INCOME_TAX: readonly IncomeTaxTable[] = [
  {
    from: "2026-01-01",
    to: "2026-12-31",
    brackets: [
      { from: 0, to: 918_000, percent: 0 },
      { from: 918_000, to: 1_347_000, percent: 10 },
      { from: 1_347_000, to: 2_364_000, percent: 15 },
      { from: 2_364_000, to: 4_727_000, percent: 20 },
      { from: 4_727_000, to: null, percent: 25 },
    ],
    source: "Hacienda, Tramos de renta 2026 https://www.hacienda.go.cr/docs/TramosRenta2026.pdf",
  },
];

export const incomeTaxTableOn = (date: ISODate) => mustFind(INCOME_TAX, date, "tramos del impuesto sobre la renta");

/** Monthly income tax withheld on a gross salary: progressive by bracket. Family tax credits are out of scope. */
export const incomeTax = (monthlyGross: number, date: ISODate) =>
  round2(incomeTaxTableOn(date).brackets.reduce((sum, b) => sum + Math.max(0, Math.min(monthlyGross, b.to ?? Infinity) - b.from) * (b.percent / 100), 0));
