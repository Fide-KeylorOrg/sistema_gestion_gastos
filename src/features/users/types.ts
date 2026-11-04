import type { PermissionKey } from "@/features/access/types";

export type User = {
  id: string;
  fullName: string;
  username: string;
  email: string;
  roleId: string;
  active: boolean;
  mustChangePassword: boolean;
  createdAt: string; // ISO timestamp
  lastLoginAt: string | null;
};

export type UserChangeAction =
  | "CREADO"
  | "DATOS_EDITADOS"
  | "ROL_CAMBIADO"
  | "ACTIVADO"
  | "DESACTIVADO"
  | "CONTRASENA_CAMBIADA"
  | "CONTRASENA_RESTABLECIDA";

export const USER_CHANGE_LABEL: Record<UserChangeAction, string> = {
  CREADO: "Usuario creado",
  DATOS_EDITADOS: "Datos editados",
  ROL_CAMBIADO: "Rol cambiado",
  ACTIVADO: "Usuario activado",
  DESACTIVADO: "Usuario desactivado",
  CONTRASENA_CAMBIADA: "Contraseña cambiada",
  CONTRASENA_RESTABLECIDA: "Contraseña restablecida",
};

export type UserChange = {
  id: string;
  userId: string;
  at: string;
  action: UserChangeAction;
  detail: string; // nunca incluye el valor de contraseñas
  actorName: string;
};

export type Role = {
  id: string;
  name: string;
  permissions: PermissionKey[];
  createdAt: string;
};

export type RoleSummary = Role & { userCount: number };
export type RoleDetail = Role & { users: Pick<User, "id" | "fullName" | "username" | "active">[] };

export type UserFilters = { search?: string; roleId?: string; active?: "all" | "active" | "inactive" };

export type UserDetail = { user: User; role: Role; changes: UserChange[] };

export type UserInput = { fullName: string; username: string; email: string; roleId: string };
export type CreateUserInput = UserInput & { temporaryPassword: string };

export type ChangePasswordInput = { current: string; next: string; confirm: string };

/** Tipos de acción registrados en la bitácora (HU-15). */
export type AuditAction =
  | "login.success"
  | "login.failure"
  | "logout"
  | "logout.idle"
  | "user.create"
  | "user.update"
  | "user.activate"
  | "user.deactivate"
  | "user.role"
  | "user.password.change"
  | "user.password.reset"
  | "role.create"
  | "role.update";

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  "login.success": "Inicio de sesión",
  "login.failure": "Intento de acceso fallido",
  logout: "Cierre de sesión",
  "logout.idle": "Cierre por inactividad",
  "user.create": "Creación de usuario",
  "user.update": "Edición de usuario",
  "user.activate": "Activación de usuario",
  "user.deactivate": "Desactivación de usuario",
  "user.role": "Cambio de rol",
  "user.password.change": "Cambio de contraseña",
  "user.password.reset": "Restablecimiento de contraseña",
  "role.create": "Creación de rol",
  "role.update": "Modificación de rol",
};

export type AuditEntry = {
  id: string;
  at: string;
  actorName: string;
  actorId: string | null;
  action: AuditAction;
  target: string | null;
  detail: string;
};

export type AuditFilters = { actorId?: string; action?: AuditAction | ""; from?: string; to?: string };
