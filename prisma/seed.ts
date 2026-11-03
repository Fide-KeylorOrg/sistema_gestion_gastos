import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { PERMISSIONS } from "../src/lib/permissions";

// Idempotent: re-running keeps the existing admin and only syncs the role's permissions.
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (at least 12 characters) in .env");
  }

  const role = await db.role.upsert({
    where: { name: "Administrador" },
    update: { permissions: [...PERMISSIONS] },
    create: { name: "Administrador", permissions: [...PERMISSIONS] },
  });

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

  console.log('Seed listo: rol "Administrador" y usuario "admin".');
}

main()
  .finally(() => db.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
