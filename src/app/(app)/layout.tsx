import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { IdleLogout } from "./idle-logout";

// La sesión se lee dentro de Suspense, como exige Cache Components.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-slate-500">Cargando…</p>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <AppShell user={{ fullName: user.fullName, username: user.username }} serverPermissions={user.permissions}>
      {children}
      <IdleLogout />
    </AppShell>
  );
}
