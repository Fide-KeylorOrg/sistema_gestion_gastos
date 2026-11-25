import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { PERMISSIONS, type Permission } from "../src/lib/permissions";
import { CCSS_RATES, INCOME_TAX } from "../src/lib/payroll-rates";
import type { RateCode } from "../src/generated/prisma/client";

// Roles are fixed (no role editor in the user stories); the admin only assigns one per user.
const ROLES: Record<string, Permission[]> = {
  Administrador: [...PERMISSIONS],
  Planilla: ["dashboard.view", "payroll.view", "payroll.edit", "payroll.salaries", "calendar.view"],
  Gastos: ["dashboard.view", "expenses.view", "expenses.edit", "calendar.view"],
};

// Idempotent for dev: re-running syncs the roles' permissions and resets the admin's email and password to the SEED_* values.
// shortcut: no production guard, because the seed never runs in the image; add one (or a SEED_RESET_ADMIN flag) before go-live.
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (at least 12 characters) in .env");
  }

  for (const [name, permissions] of Object.entries(ROLES)) {
    await db.role.upsert({ where: { name }, update: { permissions }, create: { name, permissions } });
  }
  const role = await db.role.findUniqueOrThrow({ where: { name: "Administrador" } });

  const passwordHash = await hashPassword(password);
  await db.user.upsert({
    where: { username: "admin" },
    // Keep admin login aligned with SEED_* in .env when seed is re-run (login never reads .env).
    update: { email, passwordHash, mustChangePassword: false },
    create: {
      fullName: "Administrador",
      username: "admin",
      email,
      passwordHash,
      roleId: role.id,
      mustChangePassword: false,
    },
  });

  await seedRates();
  console.log(`Seed listo: roles ${Object.keys(ROLES).join(", ")}, usuario "admin" y tarifas de planilla.`);
}

// Loads the versioned tables from src/lib/payroll-rates.ts until the calculations read them from the database.
async function seedRates() {
  const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
  for (const entry of CCSS_RATES) {
    const rows = [
      ...Object.entries(entry.employee).map(([code, percent]) => ({ scope: "EMPLOYEE" as const, code: code as RateCode, percent })),
      ...Object.entries(entry.employer).map(([code, percent]) => ({ scope: "EMPLOYER" as const, code: code as RateCode, percent })),
    ];
    for (const { scope, code, percent } of rows) {
      const data = { percent, effectiveTo: day(entry.to), source: entry.source };
      await db.payrollRate.upsert({
        where: { scope_code_effectiveFrom: { scope, code, effectiveFrom: day(entry.from) } },
        update: data,
        create: { scope, code, effectiveFrom: day(entry.from), ...data },
      });
    }
  }
  for (const table of INCOME_TAX) {
    const brackets = table.brackets.map((b) => ({ lowerBound: b.from, upperBound: b.to, percent: b.percent }));
    await db.incomeTaxTable.upsert({
      where: { effectiveFrom: day(table.from) },
      update: { effectiveTo: day(table.to), source: table.source, brackets: { deleteMany: {}, create: brackets } },
      create: { effectiveFrom: day(table.from), effectiveTo: day(table.to), source: table.source, brackets: { create: brackets } },
    });
  }
}

main()
  .finally(() => db.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
