import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import type { Permission } from "@/lib/permissions";
import { IdleLogout } from "./idle-logout";

const MODULES: { href: string; label: string; permission: Permission }[] = [
  { href: "/", label: "Dashboard", permission: "dashboard.view" },
  { href: "/planilla", label: "Planilla", permission: "payroll.view" },
  { href: "/gastos", label: "Gastos", permission: "expenses.view" },
  { href: "/calendario", label: "Calendario", permission: "calendar.view" },
  { href: "/usuarios", label: "Usuarios y roles", permission: "users.manage" },
];

// The session is read inside Suspense, not at the layout's top level, as Cache Components requires.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header>
        <Suspense fallback={null}>
          <Nav />
        </Suspense>
      </header>
      <main>{children}</main>
    </>
  );
}

async function Nav() {
  const user = await requireUser();
  return (
    <nav aria-label="Módulos">
      <ul>
        {MODULES.filter((m) => user.permissions.includes(m.permission)).map((m) => (
          <li key={m.href}>
            <Link href={m.href}>{m.label}</Link>
          </li>
        ))}
      </ul>
      <span>{user.fullName}</span>
      <form method="post" action="/logout">
        <button type="submit">Cerrar sesión</button>
      </form>
      <IdleLogout />
    </nav>
  );
}
