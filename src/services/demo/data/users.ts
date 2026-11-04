import type { AuditEntry, Role, User, UserChange } from "@/features/users/types";
import { ALL_PERMISSIONS, type PermissionKey } from "@/features/access/types";

const P = (...k: PermissionKey[]) => k;

export const demoRoles = (): Role[] => [
  { id: "role-admin", name: "Administrador", permissions: [...ALL_PERMISSIONS], createdAt: "2026-09-24T09:00:00-06:00" },
  {
    id: "role-conta",
    name: "Asistente Contable",
    permissions: P("planilla.consultar", "planilla.crear", "planilla.editar", "gastos.consultar", "gastos.crear", "gastos.editar", "dashboard.consultar", "calendario.consultar"),
    createdAt: "2026-10-02T10:30:00-06:00",
  },
  { id: "role-super", name: "Supervisor de Operaciones", permissions: P("gastos.consultar", "dashboard.consultar", "calendario.consultar"), createdAt: "2026-10-02T10:40:00-06:00" },
  {
    id: "role-audit",
    name: "Auditor de Control",
    permissions: P("planilla.consultar", "planilla.infoSalarial", "gastos.consultar", "dashboard.consultar", "dashboard.infoSalarial", "calendario.consultar", "calendario.infoSalarial"),
    createdAt: "2026-10-05T14:00:00-06:00",
  },
  { id: "role-vacio", name: "Consulta de calendario", permissions: P("calendario.consultar"), createdAt: "2026-10-12T08:15:00-06:00" },
];

export const demoUsers = (): User[] => [
  { id: "usr-1", fullName: "Damaris Salas Zambrana", username: "dsalas", email: "damaris.salas@losangeles.cr", roleId: "role-admin", active: true, mustChangePassword: false, createdAt: "2026-09-24T09:00:00-06:00", lastLoginAt: "2026-10-29T08:12:00-06:00" },
  { id: "usr-2", fullName: "Luis Fernando Calderón Sáenz", username: "lcalderon", email: "l.calderon@losangeles.cr", roleId: "role-conta", active: true, mustChangePassword: false, createdAt: "2026-10-02T11:00:00-06:00", lastLoginAt: "2026-10-28T15:40:00-06:00" },
  { id: "usr-3", fullName: "Patricia Mora Calvo", username: "pmora", email: "p.mora@losangeles.cr", roleId: "role-conta", active: false, mustChangePassword: false, createdAt: "2026-10-02T11:10:00-06:00", lastLoginAt: "2026-10-20T09:05:00-06:00" },
  { id: "usr-4", fullName: "Roberto Vargas Chinchilla", username: "rvargas", email: "r.vargas@losangeles.cr", roleId: "role-super", active: true, mustChangePassword: true, createdAt: "2026-10-15T08:00:00-06:00", lastLoginAt: null },
  { id: "usr-5", fullName: "Marcela Quesada Brenes", username: "mquesada", email: "m.quesada@losangeles.cr", roleId: "role-audit", active: true, mustChangePassword: false, createdAt: "2026-10-05T14:20:00-06:00", lastLoginAt: "2026-10-30T10:30:00-06:00" },
];

export const demoUserChanges = (): UserChange[] => [
  { id: "uc-1", userId: "usr-3", at: "2026-10-02T11:10:00-06:00", action: "CREADO", detail: "Usuario creado con el rol Asistente Contable.", actorName: "Damaris Salas" },
  { id: "uc-2", userId: "usr-3", at: "2026-10-21T16:00:00-06:00", action: "DESACTIVADO", detail: "Cuenta desactivada.", actorName: "Damaris Salas" },
  { id: "uc-3", userId: "usr-2", at: "2026-10-02T11:00:00-06:00", action: "CREADO", detail: "Usuario creado con el rol Supervisor de Operaciones.", actorName: "Damaris Salas" },
  { id: "uc-4", userId: "usr-2", at: "2026-10-09T09:30:00-06:00", action: "ROL_CAMBIADO", detail: "Rol anterior: Supervisor de Operaciones. Rol nuevo: Asistente Contable.", actorName: "Damaris Salas" },
  { id: "uc-5", userId: "usr-2", at: "2026-10-09T09:45:00-06:00", action: "CONTRASENA_RESTABLECIDA", detail: "Se asignó una contraseña temporal.", actorName: "Damaris Salas" },
  { id: "uc-6", userId: "usr-4", at: "2026-10-15T08:00:00-06:00", action: "CREADO", detail: "Usuario creado con el rol Supervisor de Operaciones.", actorName: "Damaris Salas" },
];

export const demoAudit = (): AuditEntry[] => {
  const A = (id: number, at: string, actorName: string, actorId: string | null, action: AuditEntry["action"], target: string | null, detail: string): AuditEntry => ({
    id: `aud-${id}`, at, actorName, actorId, action, target, detail,
  });
  return [
    A(1, "2026-10-29T08:12:00-06:00", "Damaris Salas", "usr-1", "login.success", null, "Inicio de sesión correcto."),
    A(2, "2026-10-28T15:40:00-06:00", "Luis Fernando Calderón", "usr-2", "login.success", null, "Inicio de sesión correcto."),
    A(3, "2026-10-28T17:55:00-06:00", "Luis Fernando Calderón", "usr-2", "logout.idle", null, "Sesión cerrada por 10 minutos de inactividad."),
    A(4, "2026-10-30T10:30:00-06:00", "Marcela Quesada", "usr-5", "login.success", null, "Inicio de sesión correcto."),
    A(5, "2026-10-29T07:58:00-06:00", "(usuario desconocido)", null, "login.failure", "jperez", "Usuario o contraseña incorrectos."),
    A(6, "2026-10-21T16:00:00-06:00", "Damaris Salas", "usr-1", "user.deactivate", "Patricia Mora Calvo", "Cuenta desactivada; sesiones cerradas."),
    A(7, "2026-10-15T08:00:00-06:00", "Damaris Salas", "usr-1", "user.create", "Roberto Vargas Chinchilla", "Rol asignado: Supervisor de Operaciones."),
    A(8, "2026-10-12T08:15:00-06:00", "Damaris Salas", "usr-1", "role.create", "Consulta de calendario", "1 permiso asignado."),
    A(9, "2026-10-09T09:45:00-06:00", "Damaris Salas", "usr-1", "user.password.reset", "Luis Fernando Calderón Sáenz", "Contraseña temporal asignada (el valor no se registra)."),
    A(10, "2026-10-09T09:30:00-06:00", "Damaris Salas", "usr-1", "user.role", "Luis Fernando Calderón Sáenz", "Supervisor de Operaciones → Asistente Contable."),
    A(11, "2026-10-05T14:20:00-06:00", "Damaris Salas", "usr-1", "user.create", "Marcela Quesada Brenes", "Rol asignado: Auditor de Control."),
    A(12, "2026-10-02T11:10:00-06:00", "Damaris Salas", "usr-1", "role.update", "Asistente Contable", "Permisos modificados (1 usuario afectado)."),
  ];
};
