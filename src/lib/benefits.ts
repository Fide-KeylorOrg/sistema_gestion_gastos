import { addDays, type ISODate } from "./format";

// Aguinaldo (Ley 2412) and vacaciones (Código de Trabajo, arts. 153-161). Pure functions, amounts in colones.

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Aguinaldo = total gross earnings of the period (1 Dec to 30 Nov, ordinary + extraordinary) / 12.
 * A partial period uses the same formula.
 */
export const aguinaldo = (earnings: number[]) => round2(earnings.reduce((a, n) => a + n, 0) / 12);

/** How the employee is paid: monthly salary paid monthly or biweekly (quincenal), or by the hour. */
export type PayKind = "MONTHLY" | "BIWEEKLY" | "HOURLY";

/**
 * Pay for a full vacation (2 weeks per 50 weeks worked). `averageSalary` is the average of the
 * ordinary + extraordinary salary of the last 50 weeks: per month for MONTHLY/BIWEEKLY, per week for HOURLY.
 * shortcut: the MTSS text has no hourly case; HOURLY follows its weekly rule (rest day not paid, so
 * weekly / 6 x 12). Confirm with the MTSS or an accountant.
 */
export function vacationPay(averageSalary: number, kind: PayKind): number {
  if (kind === "HOURLY") return round2((averageSalary / 6) * 12);
  return round2((averageSalary / 30) * 14); // monthly and biweekly pay already include the rest days
}

/** Vacation owed on termination before 50 weeks: 1 day per month worked, at the monthly salary / 30. */
export const vacationPayOnExit = (averageMonthlySalary: number, monthsWorked: number) =>
  round2((averageMonthlySalary / 30) * monthsWorked);

// ---------- Preaviso and auxilio de cesantía (CT arts. 28-30, Ley 7983 art. 88) ----------

/**
 * Average monthly salary: the monthly totals (ordinary + extraordinary) of the last 6 months of work,
 * or fewer if the contract is younger. Callers leave out months of sick leave (taking earlier months
 * instead).
 */
export const averageMonthlySalary = (monthlyTotals: number[]) =>
  round2(monthlyTotals.reduce((a, n) => a + n, 0) / monthlyTotals.length);

/** Daily rate from the monthly average: /30 for monthly and biweekly pay, /26 for hourly (the source's weekly-pay divisor). */
export const dailyRate = (avgMonthly: number, payment: PayKind) => avgMonthly / (payment === "HOURLY" ? 26 : 30);

/** Days of preaviso owed by tenure (indefinite contracts only): none in the first 3 months. */
export const noticeDays = (monthsWorked: number) => (monthsWorked < 3 ? 0 : monthsWorked < 6 ? 7 : monthsWorked < 12 ? 15 : 30);

/** Preaviso paid in money (when not given in time). From 1 year it is one month of salary. */
export const noticePay = (avgMonthly: number, payment: PayKind, monthsWorked: number) =>
  monthsWorked >= 12 ? round2(avgMonthly) : round2(dailyRate(avgMonthly, payment) * noticeDays(monthsWorked));

// Days per year of service, by year number (13 and later: 20).
const SEVERANCE_RATES = [19.5, 20, 20.5, 21, 21.24, 21.5, 22, 22, 22, 21.5, 21, 20.5];
const severanceRate = (year: number) => SEVERANCE_RATES[year - 1] ?? 20;

/**
 * Days of cesantía for a dismissal with employer liability. `monthsWorked` may be fractional.
 * From 1 year: each year worked, plus one more if the leftover is over 6 months, only the last 8 years.
 * shortcut: assumes the table applies to the year number of service (so the last 8 years of a long
 * tenure use their own rates); confirm with the MTSS/accountant before paying real settlements.
 */
export function severanceDays(monthsWorked: number): number {
  if (monthsWorked < 3) return 0;
  if (monthsWorked <= 6) return 7;
  if (monthsWorked < 12) return 14;
  const years = Math.floor(monthsWorked / 12) + (monthsWorked % 12 > 6 ? 1 : 0);
  let days = 0;
  for (let y = Math.max(1, years - 7); y <= years; y++) days += severanceRate(y);
  return days;
}

/** Cesantía in money. No social-charge deductions apply to it. */
export const severancePay = (avgMonthly: number, payment: PayKind, monthsWorked: number) =>
  round2(dailyRate(avgMonthly, payment) * severanceDays(monthsWorked));

// ---------- Exit settlement and dates ----------

/** Months between `start` and `endInclusive` (30-day months), e.g. 1 Jan to 30 Jun is 6, to 1 Jul is 6.03. */
export function monthsBetween(start: ISODate, endInclusive: ISODate): number {
  const [y1, m1, d1] = start.split("-").map(Number);
  const [y2, m2, d2] = endInclusive.split("-").map(Number);
  let months = (y2 - y1) * 12 + (m2 - m1);
  let days = d2 - d1 + 1;
  if (days < 0) {
    months -= 1;
    days += 30;
  }
  return months + Math.min(days, 30) / 30;
}

/** Under 50 weeks (11.5 months) a vacation day is owed per month worked; after that, the days still unused. */
export const vacationDaysOnExit = (monthsWorked: number, unusedDays: number) => (monthsWorked < 11.5 ? Math.floor(monthsWorked) : unusedDays);

export type SettlementConcept = { concept: string; days: number | null; amount: number };

/**
 * Final settlement. Proportional aguinaldo and vacation are owed on any exit; preaviso (paid in money,
 * assuming it was not given in time) and cesantía only when dismissed with employer liability.
 * shortcut: a mutual-agreement exit is treated like a resignation (nothing extra); the source does not cover it.
 */
export function settlement(i: {
  monthsWorked: number;
  avgMonthly: number;
  payment: PayKind;
  dismissedWithLiability: boolean;
  vacationDays: number;
  aguinaldoEarnings: number[];
}): SettlementConcept[] {
  const out: SettlementConcept[] = [];
  if (i.dismissedWithLiability) {
    const notice = noticeDays(i.monthsWorked);
    if (notice) out.push({ concept: "Preaviso", days: notice, amount: noticePay(i.avgMonthly, i.payment, i.monthsWorked) });
    const severance = severanceDays(i.monthsWorked);
    if (severance) out.push({ concept: "Cesantía", days: severance, amount: severancePay(i.avgMonthly, i.payment, i.monthsWorked) });
  }
  out.push({ concept: "Vacaciones proporcionales", days: i.vacationDays, amount: round2(dailyRate(i.avgMonthly, i.payment) * i.vacationDays) });
  out.push({ concept: "Aguinaldo proporcional", days: null, amount: aguinaldo(i.aguinaldoEarnings) });
  return out;
}

/** First day vacation can be taken: 50 weeks (350 days) of work, with incapacity days paused out of the count. */
export const vacationEligibleDate = (hireDate: ISODate, incapacityDays = 0) => addDays(hireDate, 350 + incapacityDays);

/** The employer must schedule the vacation within 15 weeks after it becomes due. */
export const vacationScheduleDeadline = (eligibleDate: ISODate) => addDays(eligibleDate, 15 * 7);

/** Last day to claim after the contract ends: 1 year for aguinaldo and cesantía, 30 days for the employer claiming unserved notice. */
export function claimDeadline(kind: "AGUINALDO" | "SEVERANCE" | "NOTICE", exitDate: ISODate): ISODate {
  if (kind === "NOTICE") return addDays(exitDate, 30);
  const [y, m, d] = exitDate.split("-");
  return m === "02" && d === "29" ? `${Number(y) + 1}-02-28` : `${Number(y) + 1}-${m}-${d}`;
}
