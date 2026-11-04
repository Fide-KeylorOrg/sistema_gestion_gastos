import type { PermissionKey } from "@/features/access/types";

export type NavItem = { href: string; label: string; permission: PermissionKey };
export type NavGroup = { id: string; label: string; icon: string; items: NavItem[] };

/** Menú único del sistema (todas las pantallas lo usan, a diferencia de las pantallas sueltas de Stitch). */

export const NAV_TOP: (NavItem & { icon: string })[] = [
  { href: "/", label: "Inicio", icon: "dashboard", permission: "dashboard.consultar" },
  { href: "/calendario", label: "Calendario", icon: "calendar_month", permission: "calendario.consultar" },
];

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "planilla",
    label: "Planilla",
    icon: "badge",
    items: [
      { href: "/planilla", label: "Planillas", permission: "planilla.consultar" },
      { href: "/empleados", label: "Empleados", permission: "planilla.consultar" },
      { href: "/planilla/novedades", label: "Horas y permisos", permission: "planilla.consultar" },
      { href: "/planilla/cargas-sociales", label: "Cargas sociales", permission: "planilla.consultar" },
      { href: "/planilla/liquidacion", label: "Liquidación", permission: "planilla.consultar" },
    ],
  },
  {
    id: "gastos",
    label: "Gastos",
    icon: "receipt_long",
    items: [
      { href: "/gastos", label: "Gastos", permission: "gastos.consultar" },
      { href: "/gastos/categorias", label: "Categorías", permission: "gastos.consultar" },
      { href: "/gastos/notificaciones", label: "Notificaciones", permission: "gastos.consultar" },
    ],
  },
  {
    id: "usuarios",
    label: "Usuarios",
    icon: "group",
    items: [
      { href: "/usuarios", label: "Usuarios", permission: "usuarios.administrar" },
      { href: "/usuarios/roles", label: "Roles y permisos", permission: "usuarios.administrar" },
      { href: "/usuarios/bitacora", label: "Bitácora", permission: "usuarios.administrar" },
    ],
  },
];

/** Ítem activo = el de href más largo que coincide con la ruta (evita marcar "Planillas" dentro de "Cargas sociales"). */
export function activeHref(pathname: string): string | null {
  const all = [...NAV_TOP, ...NAV_GROUPS.flatMap((g) => g.items)];
  const matches = all.filter((i) => (i.href === "/" ? pathname === "/" : pathname === i.href || pathname.startsWith(i.href + "/")));
  // /empleados pertenece al grupo Planilla pero tiene su propio ítem; /planilla/[id] cae en "Planillas".
  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}
