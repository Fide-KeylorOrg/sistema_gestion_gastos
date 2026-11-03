"use server";

import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { startSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

export type LoginState = {
  username?: string;
  error?: string;
  fieldErrors?: { username?: string; password?: string };
};

// Unknown usernames are checked against this hash so the response time doesn't reveal which usernames exist.
let dummyHash: Promise<string> | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const fieldErrors: LoginState["fieldErrors"] = {};
  if (!username) fieldErrors.username = "Ingrese su usuario.";
  if (!password) fieldErrors.password = "Ingrese su contraseña.";
  if (fieldErrors.username || fieldErrors.password) return { username, fieldErrors };

  const user = await db.user.findUnique({ where: { username } });
  const valid = await verifyPassword(password, user?.passwordHash ?? (await (dummyHash ??= hashPassword("x"))));

  if (!user || !valid) {
    await audit("login.failure", { actorId: user?.id, detail: { username } });
    return { username, error: "Usuario o contraseña incorrectos." };
  }
  if (!user.active) {
    await audit("login.failure", { actorId: user.id, detail: { username, reason: "inactive" } });
    return { username, error: "La cuenta no tiene acceso al sistema. Comuníquese con el administrador." };
  }

  await startSession(user.id);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit("login.success", { actorId: user.id });
  redirect("/");
}
