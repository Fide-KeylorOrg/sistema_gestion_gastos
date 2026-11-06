import { fail, ok } from "@/lib/result";
import type { AuditService, RolesService, UsersService } from "../contracts";
import { ADMIN_PERMISSION } from "@/features/access/types";
import { validateChangePassword, validateRoleForm, validateUserForm } from "@/features/users/validation";
import type { UserChangeAction } from "@/features/users/types";
import { audit, db, done, nowISO, uid } from "./store";
import { DEMO_ACTOR } from "./clock";

const roleOf = (id: string) => db.roles.find((r) => r.id === id);
const activeAdmins = (excludeUserId?: string) =>
  db.users.filter((u) => u.active && u.id !== excludeUserId && roleOf(u.roleId)?.permissions.includes(ADMIN_PERMISSION));

function change(userId: string, action: UserChangeAction, detail: string) {
  db.userChanges.unshift({ id: uid("uc"), userId, at: nowISO(), action, detail, actorName: DEMO_ACTOR });
}

const LAST_ADMIN = "Debe existir al menos un administrador activo.";

export const demoUsersService: UsersService = {
  async list(f) {
    const q = f.search?.trim().toLowerCase();
    return db.users
      .filter((u) => !q || u.fullName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
      .filter((u) => !f.roleId || u.roleId === f.roleId)
      .filter((u) => !f.active || f.active === "all" || (f.active === "active") === u.active)
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map((u) => ({ ...u, roleName: roleOf(u.roleId)?.name ?? "—" }));
  },
  async get(id) {
    const user = db.users.find((u) => u.id === id);
    const role = user && roleOf(user.roleId);
    if (!user || !role) return null;
    return { user: { ...user }, role: { ...role }, changes: db.userChanges.filter((c) => c.userId === id).sort((a, b) => b.at.localeCompare(a.at)) };
  },
  async create(input) {
    const errors = validateUserForm(input, { requirePassword: true });
    if (Object.keys(errors).length) return fail("VALIDATION", "Revise los campos indicados.", errors);
    const username = input.username.trim().toLowerCase();
    const email = input.email.trim().toLowerCase();
    const dup: Record<string, string> = {};
    if (db.users.some((u) => u.username === username)) dup.username = "Ya existe un usuario con este nombre de usuario.";
    if (db.users.some((u) => u.email === email)) dup.email = "Ya existe un usuario con este correo electrónico.";
    if (Object.keys(dup).length) return fail("DUPLICATE", "El usuario ya existe.", dup);
    const user = { id: uid("usr"), fullName: input.fullName.trim(), username, email, roleId: input.roleId, active: true, mustChangePassword: true, createdAt: nowISO(), lastLoginAt: null };
    db.users.push(user);
    change(user.id, "CREADO", `Usuario creado con el rol ${roleOf(input.roleId)?.name}.`);
    audit("user.create", user.fullName, `Rol asignado: ${roleOf(input.roleId)?.name}.`);
    done();
    return ok(user);
  },
  async update(id, input) {
    const user = db.users.find((u) => u.id === id);
    if (!user) return fail("NOT_FOUND", "El usuario no existe.");
    const errors = validateUserForm({ ...input, roleId: user.roleId }, { requirePassword: false });
    if (Object.keys(errors).length) return fail("VALIDATION", "Revise los campos indicados.", errors);
    const username = input.username.trim().toLowerCase();
    const email = input.email.trim().toLowerCase();
    const dup: Record<string, string> = {};
    if (db.users.some((u) => u.id !== id && u.username === username)) dup.username = "Este nombre de usuario ya pertenece a otro usuario.";
    if (db.users.some((u) => u.id !== id && u.email === email)) dup.email = "Este correo ya pertenece a otro usuario.";
    if (Object.keys(dup).length) return fail("DUPLICATE", "Hay datos duplicados.", dup);
    Object.assign(user, { fullName: input.fullName.trim(), username, email });
    change(id, "DATOS_EDITADOS", "Se actualizaron nombre, usuario o correo.");
    audit("user.update", user.fullName, "Datos de la cuenta actualizados.");
    done();
    return ok(user);
  },
  async setActive(id, active) {
    const user = db.users.find((u) => u.id === id);
    if (!user) return fail("NOT_FOUND", "El usuario no existe.");
    if (!active && roleOf(user.roleId)?.permissions.includes(ADMIN_PERMISSION) && activeAdmins(id).length === 0) return fail("CONFLICT", LAST_ADMIN);
    user.active = active;
    change(id, active ? "ACTIVADO" : "DESACTIVADO", active ? "Cuenta activada." : "Cuenta desactivada; sesiones abiertas cerradas.");
    audit(active ? "user.activate" : "user.deactivate", user.fullName, active ? "Cuenta activada." : "Cuenta desactivada; sesiones cerradas.");
    done();
    return ok(undefined);
  },
  async changeRole(id, roleId) {
    const user = db.users.find((u) => u.id === id);
    if (!user) return fail("NOT_FOUND", "El usuario no existe.");
    const role = roleOf(roleId);
    if (!role) return fail("VALIDATION", "El rol es obligatorio.", { roleId: "El rol es obligatorio." });
    if (user.active && roleOf(user.roleId)?.permissions.includes(ADMIN_PERMISSION) && !role.permissions.includes(ADMIN_PERMISSION) && activeAdmins(id).length === 0)
      return fail("CONFLICT", LAST_ADMIN);
    const previous = roleOf(user.roleId)?.name;
    user.roleId = roleId;
    change(id, "ROL_CAMBIADO", `Rol anterior: ${previous}. Rol nuevo: ${role.name}.`);
    audit("user.role", user.fullName, `${previous} → ${role.name}.`);
    done();
    return ok(undefined);
  },
  async resetPassword(id) {
    const user = db.users.find((u) => u.id === id);
    if (!user) return fail("NOT_FOUND", "El usuario no existe.");
    if (!user.active) return fail("CONFLICT", "El usuario debe activarse primero.");
    // En el backend real la contraseña la genera el servidor y se muestra una única vez.
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    const temporaryPassword = Array.from(crypto.getRandomValues(new Uint32Array(14)), (b) => alphabet[b % alphabet.length]).join("");
    user.mustChangePassword = true;
    change(id, "CONTRASENA_RESTABLECIDA", "Se asignó una contraseña temporal (el valor no se registra).");
    audit("user.password.reset", user.fullName, "Contraseña temporal asignada (el valor no se registra).");
    done();
    return ok({ temporaryPassword });
  },
  async changeOwnPassword(input) {
    const errors = validateChangePassword(input);
    if (Object.keys(errors).length) return fail("VALIDATION", "Revise los campos indicados.", errors);
    if (input.current !== db.demoPassword) return fail("VALIDATION", "La contraseña actual es incorrecta.", { current: "La contraseña actual es incorrecta." });
    db.demoPassword = input.next;
    change("usr-1", "CONTRASENA_CAMBIADA", "El usuario cambió su contraseña (el valor no se registra).");
    audit("user.password.change", DEMO_ACTOR, "Cambio de contraseña (el valor no se registra).");
    done();
    return ok(undefined);
  },
};

export const demoRolesService: RolesService = {
  async list() {
    return db.roles.map((r) => ({ ...r, userCount: db.users.filter((u) => u.roleId === r.id).length })).sort((a, b) => a.name.localeCompare(b.name));
  },
  async get(id) {
    const role = roleOf(id);
    if (!role) return null;
    return { ...role, users: db.users.filter((u) => u.roleId === id).map((u) => ({ id: u.id, fullName: u.fullName, username: u.username, active: u.active })) };
  },
  async create(input) {
    const errors = validateRoleForm(input);
    if (Object.keys(errors).length) return fail("VALIDATION", "Revise los campos indicados.", errors);
    if (db.roles.some((r) => r.name.toLowerCase() === input.name.trim().toLowerCase())) return fail("DUPLICATE", "El nombre del rol ya está en uso.", { name: "El nombre del rol ya está en uso." });
    const role = { id: uid("role"), name: input.name.trim(), permissions: input.permissions, createdAt: nowISO() };
    db.roles.push(role);
    audit("role.create", role.name, `${role.permissions.length} permisos asignados.`);
    done();
    return ok(role);
  },
  async update(id, input) {
    const role = roleOf(id);
    if (!role) return fail("NOT_FOUND", "El rol no existe.");
    const errors = validateRoleForm(input);
    if (Object.keys(errors).length) return fail("VALIDATION", "Revise los campos indicados.", errors);
    if (db.roles.some((r) => r.id !== id && r.name.toLowerCase() === input.name.trim().toLowerCase())) return fail("DUPLICATE", "El nombre del rol ya está en uso.", { name: "El nombre del rol ya está en uso." });
    const losesAdmin = role.permissions.includes(ADMIN_PERMISSION) && !input.permissions.includes(ADMIN_PERMISSION);
    if (losesAdmin) {
      const others = db.users.filter((u) => u.active && u.roleId !== id && roleOf(u.roleId)?.permissions.includes(ADMIN_PERMISSION));
      if (others.length === 0 && db.users.some((u) => u.active && u.roleId === id)) return fail("CONFLICT", "Debe quedar al menos un usuario activo con permiso para administrar usuarios y roles.");
    }
    role.name = input.name.trim();
    role.permissions = input.permissions;
    audit("role.update", role.name, `Permisos modificados (${db.users.filter((u) => u.roleId === id).length} usuarios afectados).`);
    done();
    return ok(role);
  },
};

export const demoAuditService: AuditService = {
  async list(f) {
    return db.audit
      .filter((a) => !f.actorId || a.actorId === f.actorId)
      .filter((a) => !f.action || a.action === f.action)
      .filter((a) => !f.from || a.at.slice(0, 10) >= f.from)
      .filter((a) => !f.to || a.at.slice(0, 10) <= f.to)
      .sort((a, b) => b.at.localeCompare(a.at));
  },
};
