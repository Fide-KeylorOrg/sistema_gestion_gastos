import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { PERMISSIONS, type Permission } from "../src/lib/permissions";

// Roles are fixed (no role editor in the user stories); the admin only assigns one per user.
const ROLES: Record<string, Permission[]> = {
  Administrador: [...PERMISSIONS],
  Planilla: ["dashboard.view", "payroll.view", "payroll.edit", "payroll.salaries", "calendar.view"],
  Gastos: ["dashboard.view", "expenses.view", "expenses.edit", "calendar.view"],
};

// Idempotent: re-running keeps the existing admin and only syncs the roles' permissions.
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

  await db.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      fullName: "Administrador",
      username: "admin",
      email,
      passwordHash: await hashPassword(password),
      roleId: role.id,
    },
  });

  console.log(`Seed listo: roles ${Object.keys(ROLES).join(", ")} y usuario "admin".`);
}

main()
  .finally(() => db.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
