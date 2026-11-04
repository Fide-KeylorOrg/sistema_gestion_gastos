import { isBlank, isEmail, MSG, passwordProblem } from "@/lib/validation";
import type { FieldErrors } from "@/lib/result";
import { ADMIN_PERMISSION, type PermissionKey } from "@/features/access/types";

export type UserFormValues = { fullName: string; username: string; email: string; roleId: string; temporaryPassword?: string };

/** Validaciones de cliente de HU-3 y HU-6. El servidor debe repetirlas y además comprobar duplicados. */
export function validateUserForm(v: UserFormValues, opts: { requirePassword: boolean }): FieldErrors {
  const e: FieldErrors = {};
  if (isBlank(v.fullName)) e.fullName = MSG.required;
  if (isBlank(v.username)) e.username = MSG.required;
  else if (/\s/.test(v.username.trim())) e.username = "El nombre de usuario no puede contener espacios.";
  if (isBlank(v.email)) e.email = MSG.required;
  else if (!isEmail(v.email)) e.email = MSG.email;
  if (opts.requirePassword) {
    if (isBlank(v.roleId)) e.roleId = "Seleccione un rol.";
    if (isBlank(v.temporaryPassword)) e.temporaryPassword = MSG.required;
    else {
      const p = passwordProblem(v.temporaryPassword!);
      if (p) e.temporaryPassword = p;
    }
  }
  return e;
}

export function validateChangePassword(v: { current: string; next: string; confirm: string }): FieldErrors {
  const e: FieldErrors = {};
  if (isBlank(v.current)) e.current = MSG.required;
  if (isBlank(v.next)) e.next = MSG.required;
  else {
    const p = passwordProblem(v.next);
    if (p) e.next = p;
  }
  if (isBlank(v.confirm)) e.confirm = MSG.required;
  else if (v.confirm !== v.next) e.confirm = "La confirmación no coincide con la contraseña nueva.";
  return e;
}

export function validateRoleForm(v: { name: string; permissions: PermissionKey[] }): FieldErrors {
  const e: FieldErrors = {};
  if (isBlank(v.name)) e.name = "El nombre del rol es obligatorio.";
  if (v.permissions.length === 0) e.permissions = "Debe seleccionarse al menos un permiso.";
  return e;
}

export const grantsAdmin = (permissions: PermissionKey[]) => permissions.includes(ADMIN_PERMISSION);

/** Genera una contraseña temporal aleatoria en el navegador (solo para el formulario de HU-3). */
export function generateTemporaryPassword(length = 14): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
