"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";
import { ToastProvider } from "@/components/ui/toast";
import { SessionProvider, useSession } from "@/features/access/demo-session";
import { requiredPermissionForRoute } from "@/features/access/types";
import { activeHref, NAV_GROUPS, NAV_TOP } from "./nav-config";

export function AppShell({ user, serverPermissions, children }: { user: { fullName: string; username: string }; serverPermissions: string[]; children: ReactNode }) {
  return (
    <SessionProvider userName={user.fullName} serverPermissions={serverPermissions}>
      <ToastProvider>
        <Frame user={user}>{children}</Frame>
      </ToastProvider>
    </SessionProvider>
  );
}

function Frame({ user, children }: { user: { fullName: string; username: string }; children: ReactNode }) {
  const pathname = usePathname();
  const { can } = useSession();
  const [open, setOpen] = useState(false);
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(false);
  }
  const required = requiredPermissionForRoute(pathname);
  const allowed = !required || can(required);

  return (
    <div className="min-h-screen">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[70] focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Saltar al contenido
      </a>
      {open && <div className="no-print fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}
      <Sidebar open={open} pathname={pathname} onNavigate={() => setOpen(false)} />
      <div className="lg:pl-[260px]">
        <Topbar user={user} onMenu={() => setOpen(true)} />
       
        <main id="contenido" className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-8">
          {allowed ? children : <NoPermission />}
        </main>
      </div>
    </div>
  );
}

function NoPermission() {
  return (
    <div role="alert" className="mx-auto mt-10 max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center">
      <Icon name="lock" className="!text-4xl text-slate-300" />
      <h1 className="mt-3 text-lg font-semibold text-slate-900">Acceso denegado</h1>
      <p className="mt-1 text-sm text-slate-600">No tiene permiso para realizar esta acción.</p>
      <Link href="/" className="mt-4 inline-block text-sm font-medium text-blue-700 hover:underline">
        Ir al inicio
      </Link>
    </div>
  );
}

function Sidebar({ open, pathname, onNavigate }: { open: boolean; pathname: string; onNavigate: () => void }) {
  const { can } = useSession();
  const current = activeHref(pathname);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <aside
      aria-label="Navegación principal"
      className={cn(
        "no-print fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-slate-900 text-slate-400 transition-transform lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="p-4">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-3 rounded-lg bg-white p-2">
          <Image unoptimized src="/logo.png" alt="" width={40} height={40} className="size-10 rounded" />
          <span className="leading-tight">
            <span className="block text-[13px] font-bold text-slate-900">Supermercado Los Ángeles</span>
            <span className="block text-xs text-slate-500">Gastos administrativos</span>
          </span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {NAV_TOP.filter((i) => can(i.permission)).map((i) => (
          <NavLink key={i.href} href={i.href} icon={i.icon} label={i.label} active={current === i.href} onNavigate={onNavigate} />
        ))}
        {NAV_GROUPS.map((g) => {
          const items = g.items.filter((i) => can(i.permission));
          if (!items.length) return null;
          const hasActive = items.some((i) => i.href === current);
          const isOpen = expanded[g.id] ?? hasActive;
          return (
            <div key={g.id}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setExpanded((s) => ({ ...s, [g.id]: !isOpen }))}
                className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-slate-800 hover:text-slate-50", hasActive && !isOpen && "text-white")}
              >
                <Icon name={g.icon} className="text-slate-500" />
                <span className="flex-1">{g.label}</span>
                <Icon name={isOpen ? "expand_less" : "expand_more"} />
              </button>
              {isOpen && (
                <ul className="mt-1 space-y-0.5">
                  {items.map((i) => (
                    <li key={i.href}>
                      <Link
                        href={i.href}
                        onClick={onNavigate}
                        aria-current={current === i.href ? "page" : undefined}
                        className={cn(
                          "block rounded-md py-2 pl-11 pr-3 text-sm hover:bg-slate-800 hover:text-slate-50",
                          current === i.href && "bg-blue-700 font-semibold text-white hover:bg-blue-700",
                        )}
                      >
                        {i.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 p-3">
        <form method="post" action="/logout">
          <button type="submit" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 hover:text-slate-50">
            <Icon name="logout" className="text-slate-500" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}

function NavLink({ href, icon, label, active, onNavigate }: { href: string; icon: string; label: string; active: boolean; onNavigate: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 hover:text-slate-50", active && "bg-blue-700 font-semibold text-white hover:bg-blue-700")}
    >
      <Icon name={icon} className={active ? "text-white" : "text-slate-500"} />
      {label}
    </Link>
  );
}

function Topbar({ user, onMenu }: { user: { fullName: string; username: string }; onMenu: () => void }) {
  const [menu, setMenu] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const initials = user.fullName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setMenu(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  return (
    <header className="no-print sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-8">
      <button type="button" aria-label="Abrir menú" onClick={onMenu} className="rounded p-2 text-slate-600 hover:bg-slate-100 lg:hidden">
        <Icon name="menu" />
      </button>
      <div className="ml-auto flex items-center gap-3">
       
        <div ref={box} className="relative">
          <button type="button" aria-expanded={menu} aria-haspopup="menu" onClick={() => setMenu((m) => !m)} className="flex items-center gap-2 rounded-md p-1 hover:bg-slate-100">
            <span className="flex size-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">{initials}</span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-[13px] font-semibold text-slate-900">{user.fullName}</span>
              <span className="block text-xs text-slate-500">{user.username}</span>
            </span>
            <Icon name="expand_more" className="text-slate-400" />
          </button>
          {menu && (
            <div role="menu" className="absolute right-0 mt-2 w-60 rounded-lg border border-slate-200 bg-white p-1 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.08)]">
              <Link role="menuitem" href="/cambiar-contrasena" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded px-3 py-2 text-sm text-slate-800 hover:bg-slate-50">
                <Icon name="key" className="text-slate-500" /> Cambiar contraseña
              </Link>
              <form method="post" action="/logout">
                <button role="menuitem" type="submit" className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                  <Icon name="logout" /> Cerrar sesión
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
