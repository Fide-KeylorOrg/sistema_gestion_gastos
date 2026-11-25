import { PERMISSIONS, type Permission } from "@/lib/permissions";

/**
 * Permisos del frontend = claves del servidor (src/lib/permissions.ts), sin traducción.
 * Aquí solo se decide qué mostrar u ocultar; la autorización real sigue en el servidor (requirePermission).
 */
export type PermissionKey = Permission;
export const ALL_PERMISSIONS: PermissionKey[] = [...PERMISSIONS];
export const ADMIN_PERMISSION: PermissionKey = "users.manage";

/** Agrupación para la matriz de permisos (HU-5, HU-9): módulo.acción. */
export const MODULES = ["payroll", "expenses", "dashboard", "calendar", "users"] as const;
export type ModuleKey = (typeof MODULES)[number];
export type ActionKey = "view" | "edit" | "salaries" | "manage";

export const MODULE_ACTIONS: Record<ModuleKey, ActionKey[]> = {
  payroll: ["view", "edit", "salaries"],
  expenses: ["view", "edit"],
  dashboard: ["view"],
  calendar: ["view"],
  users: ["manage"],
};

export const MODULE_LABEL: Record<ModuleKey, string> = {
  payroll: "Planilla y empleados",
  expenses: "Gastos",
  dashboard: "Dashboard",
  calendar: "Calendario",
  users: "Usuarios y roles",
};

export const ACTION_LABEL: Record<ActionKey, string> = {
  view: "Consultar",
  edit: "Crear y editar",
  salaries: "Información salarial",
  manage: "Administrar usuarios y roles",
};

/** Permiso mínimo para abrir cada ruta (HU-9 escenario 2). Las más específicas van primero. */
const ROUTE_RULES: { test: RegExp; permission: PermissionKey }[] = [
  { test: /^\/gastos\/nuevo/, permission: "expenses.edit" },
  { test: /^\/gastos\/[^/]+\/editar/, permission: "expenses.edit" },
  { test: /^\/empleados\/nuevo/, permission: "payroll.edit" },
  { test: /^\/empleados\/[^/]+\/editar/, permission: "payroll.edit" },
  { test: /^\/(planilla|empleados)/, permission: "payroll.view" },
  { test: /^\/gastos/, permission: "expenses.view" },
  { test: /^\/calendario/, permission: "calendar.view" },
  { test: /^\/usuarios/, permission: "users.manage" },
  { test: /^\/$/, permission: "dashboard.view" },
];

export function requiredPermissionForRoute(pathname: string): PermissionKey | null {
  return ROUTE_RULES.find((r) => r.test.test(pathname))?.permission ?? null;
}
