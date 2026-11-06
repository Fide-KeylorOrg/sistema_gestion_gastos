/**
 * Permisos por módulo y acción (HU-9, HU-11, HU-12): consultar, crear, editar, consultar información salarial.
 * Representación del FRONTEND. La autorización real sigue en el servidor (src/lib/permissions.ts, requirePermission).
 * Al conectar el backend, el mapeo de claves está en `permissionsFromServer`.
 */
export const MODULES = ["planilla", "gastos", "dashboard", "calendario", "usuarios"] as const;
export type ModuleKey = (typeof MODULES)[number];

export type ActionKey = "consultar" | "crear" | "editar" | "infoSalarial" | "administrar";

export const MODULE_ACTIONS: Record<ModuleKey, ActionKey[]> = {
  planilla: ["consultar", "crear", "editar", "infoSalarial"],
  gastos: ["consultar", "crear", "editar"],
  dashboard: ["consultar", "infoSalarial"],
  calendario: ["consultar", "infoSalarial"],
  usuarios: ["administrar"],
};

export const MODULE_LABEL: Record<ModuleKey, string> = {
  planilla: "Planilla y empleados",
  gastos: "Gastos",
  dashboard: "Dashboard",
  calendario: "Calendario",
  usuarios: "Usuarios y roles",
};

export const ACTION_LABEL: Record<ActionKey, string> = {
  consultar: "Consultar",
  crear: "Crear",
  editar: "Editar",
  infoSalarial: "Información salarial",
  administrar: "Administrar usuarios y roles",
};

export type PermissionKey = `${ModuleKey}.${ActionKey}`;

export const ALL_PERMISSIONS: PermissionKey[] = MODULES.flatMap((m) => MODULE_ACTIONS[m].map((a) => `${m}.${a}` as PermissionKey));
export const ADMIN_PERMISSION: PermissionKey = "usuarios.administrar";

/** Claves actuales del servidor (src/lib/permissions.ts) → claves del frontend. */
export function permissionsFromServer(keys: string[]): PermissionKey[] {
  const map: Record<string, PermissionKey[]> = {
    "users.manage": ["usuarios.administrar"],
    "dashboard.view": ["dashboard.consultar"],
    "payroll.view": ["planilla.consultar"],
    "payroll.edit": ["planilla.crear", "planilla.editar"],
    "payroll.salaries": ["planilla.infoSalarial", "dashboard.infoSalarial", "calendario.infoSalarial"],
    "expenses.view": ["gastos.consultar"],
    "expenses.edit": ["gastos.crear", "gastos.editar"],
    "calendar.view": ["calendario.consultar"],
  };
  return [...new Set(keys.flatMap((k) => map[k] ?? []))];
}

/** Permiso mínimo para abrir cada ruta (HU-12 escenario 2). Las más específicas van primero. */
const ROUTE_RULES: { test: RegExp; permission: PermissionKey }[] = [
  { test: /^\/gastos\/nuevo/, permission: "gastos.crear" },
  { test: /^\/gastos\/[^/]+\/editar/, permission: "gastos.editar" },
  { test: /^\/gastos\/(notificaciones|categorias)/, permission: "gastos.consultar" },
  { test: /^\/empleados\/nuevo/, permission: "planilla.crear" },
  { test: /^\/empleados\/[^/]+\/editar/, permission: "planilla.editar" },
  { test: /^\/planilla\/(cargas-sociales|liquidacion)/, permission: "planilla.consultar" },
  { test: /^\/(planilla|empleados)/, permission: "planilla.consultar" },
  { test: /^\/gastos/, permission: "gastos.consultar" },
  { test: /^\/calendario/, permission: "calendario.consultar" },
  { test: /^\/usuarios/, permission: "usuarios.administrar" },
  { test: /^\/$/, permission: "dashboard.consultar" },
];

export function requiredPermissionForRoute(pathname: string): PermissionKey | null {
  return ROUTE_RULES.find((r) => r.test.test(pathname))?.permission ?? null;
}
