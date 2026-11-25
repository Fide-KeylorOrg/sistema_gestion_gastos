# sistema_gestion_gastos

Payroll and administrative expense management for Supermercado Los Ángeles. Requirements and user stories are in [`docs/`](docs/).

Next.js 16 (App Router, Cache Components) + Prisma 7 + PostgreSQL 17 (Docker locally, RDS in AWS).

## First-time setup

Requires Node 24+, Docker and `make`.

```bash
cp .env.example .env   # set SEED_ADMIN_PASSWORD (12+ characters)
npm install            # also generates the Prisma client
make migrate           # starts Postgres in Docker (localhost:5434) and applies migrations
make seed              # creates the "Administrador" role and the "admin" user
```

Log in as `admin` with the `SEED_ADMIN_PASSWORD` from `.env`.

## Running the app

| Mode | Command | URL | Use it for |
| --- | --- | --- | --- |
| Development | `make dev` | http://localhost:3010 | Coding, with hot reload |
| Production image | `make app` | http://localhost:3100 | Checking a change in the same image AWS runs, before pushing |

Both use the same Postgres container and data. `make app` builds the image, applies pending migrations in a one-off `migrate` container, then starts the app. Open it via `localhost`: the production login cookie is HTTPS-only, and browsers make an exception just for `localhost`.

## Other commands

| Command | What it does |
| --- | --- |
| `make migrate name=add_x` | Create and apply a migration after editing `prisma/schema.prisma` |
| `make test` | Run tests against a separate `gastos_test` database |
| `npm run lint` / `npm run build` | Lint / production build |
| `make reset` | Wipe the dev database, re-apply migrations and re-seed |
| `make down` | Stop all containers (data is kept in the `db-data` volume) |

## Social charges and income tax

`src/lib/payroll-rates.ts` holds the rates and the calculations, with tests in `src/lib/payroll-rates.test.ts`. Rates are **versioned by date**: each table entry has `from`, `to` and the `source` it came from, and every function takes the date the salary belongs to (for a payroll, its `periodEnd`). Use the entry in force that day; a date with no entry throws `No hay ... cargados para <fecha>` instead of silently reusing old values, and `createPayroll` in the demo refuses such a period.

| What | Function | Rule |
| --- | --- | --- |
| Employee charges | `employeeCharges(gross, date)` | 2026: SEM 5.50% + IVM 4.33% + Banco Popular 1.00% = 10.83%, withheld from the gross salary. |
| Employer charges | `employerCharges(gross, date)` | 2026: 26.83% of the gross salary, by component: SEM 9.25, IVM 5.58, Asignaciones Familiares 5.00, IMAS 0.50, INA 1.50, Banco Popular 0.50 (0.25 CCSS + 0.25 LPT), FCL 1.50, OPC 2.00 and INS 1.00. |
| Income tax | `incomeTax(monthlyGross, date)` | 2026 monthly brackets for salaried workers: up to ₡918.000 exempt, then 10%, 15%, 20% and 25% on the excess. Family tax credits are out of scope (not modelled). |

Coverage today: CCSS rates from 2023-01-01 to 2028-12-31 (the IVM is fixed until then; 2023-2025 uses IVM 5.42 / 4.17, 26.67% / 10.67% in total) and income tax brackets for 2026 only.

**Keeping the rates up to date**

- **Every December**, Hacienda publishes the income tax brackets for the next year. Add an entry to `INCOME_TAX` (`from` 1 Jan, `to` 31 Dec, the `source` link) before the first January payroll, or that payroll will fail loudly.
- **When the CCSS or a law changes a rate** (the IVM reaches 12.16% in 2029): end the current `CCSS_RATES` entry the day before, and add a new one starting on the effective date with the changed numbers and the `source`. Never edit an old entry, so past dates keep calculating with the rates they had.
- The tests check that each table is ordered with no gaps or overlaps. The demo parameters screen (HU-22) only displays today's values and does not feed the calculations.
- Aguinaldo and cesantía carry no social charges. The INS 1.00% is the CCSS reference rate for the risk policy and is part of its 26.83% total; the real premium depends on the INS policy.

**Sources (all official except the last line)**

- Employee and employer rates: [CCSS, Información y servicios para patronos](https://www.ccss.sa.cr/patronos) (employer calculator, 2026): 26.83% employer, 10.83% employee.
- IVM increase (5.58% employer, 4.33% employee, from 2026-01-01): [CCSS news, 18/12/2025](https://www.ccss.sa.cr/noticias/noticia?v=822124515110).
- Income tax brackets: [Hacienda, Tramos de renta 2026](https://www.hacienda.go.cr/docs/TramosRenta2026.pdf).
- Cross-checks: [Softland](https://softland.com/cr/calculo-cargas-sociales-ccss-2026/), [AG Legal](https://aglegal.com/es/calculadora-cargas-sociales-retencion-salarial-costa-rica/), [BDO](https://www.bdo.cr/es-cr/publicaciones/2025/costa-rica-ajuste-en-cuotas-obrero-patronales-de-la-ccss-a-partir-del-1-de-enero-de-2026). The Softland table left out the INS 1.00%, which is why its components added up to 25.83%.

**Pending**

- Which date a payroll uses: its `periodEnd`. A period that crosses a rate change (rates change on 1 January) would use the new rates for the whole period.
- Reduced employer rate of 25.33% (non-agricultural employers under 5 workers, no INA): only private sources (BDO, AG Legal, Alegra) state it, and it is not modelled. Confirm the company's size and sector.
- Minimum contributory base (Decreto 44756-MTSS): salaries below ₡346.789 (SEM) or ₡324.590 (IVM) are charged on that base. Not applied.
- The CCSS asks for the monthly salary to be reported even when paid biweekly (₡200.000 biweekly is reported as ₡400.000), so biweekly lines must be annualized to monthly before this module is used.
- The demo payroll lines apply social charges only. Income tax is not withheld there: payrolls are biweekly and the brackets are monthly, so the base has to be projected first.
- The rates live in code. If the administration must edit them without a deploy, move the same versioned tables to the database (the demo parameters screen already has `effectiveFrom`) and keep the date lookup.

## Labor benefits calculations

`src/lib/benefits.ts` holds pure functions (amounts in colones, rounded half-up to 2 decimals) with tests in `src/lib/benefits.test.ts`. Source: MTSS frequently asked questions, [Asuntos laborales](https://www.mtss.go.cr/temas-laborales/index.html) (Ley 2412, Código de Trabajo arts. 28-30 and 153-161, Ley 7983 art. 88).

| Benefit | Function | Rule |
| --- | --- | --- |
| Aguinaldo | `aguinaldo(earnings)` | Gross ordinary + extraordinary earnings of 1 Dec to 30 Nov, divided by 12. A partial period uses the same formula. Only alimony may be deducted. |
| Vacation pay | `vacationPay(avgSalary, kind)` | Monthly and biweekly: monthly salary / 30 x 14. Hourly: weekly earnings / 6 x 12 (assumed, see pending decisions). |
| Vacation on exit | `vacationPayOnExit(avgMonthly, months)` | Before 50 weeks: 1 day per month worked, at monthly salary / 30. |
| Preaviso | `noticeDays`, `noticePay` | Indefinite contracts only. Under 3 months: none. 3-6: 7 days. 6-12: 15 days. From 1 year: one month. |
| Cesantía | `severanceDays`, `severancePay` | Dismissal with employer liability. 3-6 months: 7 days. 6-12: 14 days. From 1 year: yearly table (19.5 to 22 days), a fraction over 6 months counts as a year, last 8 years only. No social-charge deductions. |
| Settlement | `settlement`, `vacationDaysOnExit`, `monthsBetween` | Aguinaldo and vacation are owed on any exit. Preaviso (paid in money) and cesantía only on dismissal with employer liability. Vacation: a day per month under 50 weeks, the unused balance after. |
| Dates | `vacationEligibleDate`, `vacationScheduleDeadline`, `claimDeadline` | Vacation due after 50 weeks (incapacity days paused), to be scheduled within 15 weeks. Claims: 1 year for aguinaldo and cesantía, 30 days for unserved notice. |
| Daily rate | `averageMonthlySalary`, `dailyRate` | Average of the last 6 months of work (sick-leave months excluded). Monthly and biweekly pay / 30, hourly / 26 (assumed). |

Maternity leave is out of scope: the app does not model it.

**Wired so far.** Only the demo liquidation (`calculateLiquidation` in `src/services/demo/payroll.ts`) uses `settlement`, with the current salary assumed constant. `provisions.aguinaldo` and `provisions.liquidation` are still `null`, and the date helpers are not called from the app yet.

**Pending decisions**

- Which `PayrollItem.code` values count as earnings (overtime, bonuses). They are not defined yet.
- Biweekly payrolls that cross 30 Nov / 1 Dec: prorate by days or assign by `payDate`.
- Cesantía table: read as indexed by the year of service (a 10-year tenure pays years 3-10). Confirm with the MTSS or an accountant.
- Vacation on exit: 1 day per month at salary / 30, as the text says. Some accountants use 14/12 per month.
- Hourly employees (`SalaryBasis.HOURLY`): the source has no hourly case, so they follow its weekly-pay rules (vacation weekly / 6 x 12, daily rate monthly / 26). Confirm.
- Weekly-pay and commerce rules from the source were dropped on purpose: the app only has monthly, biweekly and hourly pay.
- Alimony deduction on aguinaldo has no model.

**Not implemented (need data or screens that do not exist yet)**

- Vacation: split into two periods, no accumulation, compensation limits, written record.
- Preaviso: weekly day off, immediate dismissal for cause.
- Social-charge percentages: the source gives the rule, not the rates.

## Conventions

- **Authorization:** every page and Server Action that touches protected data calls `requirePermission("...")` from `src/lib/auth.ts`. Hiding a menu link is not access control.
- **Permissions:** keys live in `src/lib/permissions.ts` (English, e.g. `payroll.salaries`). Text shown on screen is in Spanish.
- **Sessions:** stored in the `Session` table and expire after 10 minutes of inactivity (RQNF-007). Deactivating a user ends their sessions on the next request.
- **Audit log:** write with `audit()` from `src/lib/audit.ts`. The table is append-only at the database level.
- **Cache Components:** read the session only inside a `<Suspense>` boundary. Pages under `src/app/(app)` get one from `loading.tsx`.
- **Tests:** `*.test.ts` next to the code, using `node:test` run through `tsx`.
- **Migrations:** nothing is deployed yet, so `prisma/migrations` is kept as a single `init` that only creates tables. Before the first production deploy, squash any newer migrations back into `init` (regenerate it with `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script` and keep the hand-written rules at the end), then everyone runs `make reset`. After go-live, every schema change is a new migration.
