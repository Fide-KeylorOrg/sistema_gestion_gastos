"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import { permissionsFromServer, type PermissionKey } from "./types";
import type { Role } from "@/features/users/types";

type Session = {
  userName: string;
  /** Rol simulado ("real" = permisos reales del servidor). SOLO PARA RECORRER LA INTERFAZ (HU-12). */
  simulatedRoleId: string;
  setSimulatedRoleId: (id: string) => void;
  roles: Role[];
  permissions: PermissionKey[];
  can: (p: PermissionKey) => boolean;
};

const Ctx = createContext<Session | null>(null);

/**
 * Sesión del frontend. La autorización real la hace el servidor (requirePermission en cada página);
 * aquí solo se decide qué mostrar u ocultar. Con el backend, `permissions` vendrá de la sesión real.
 */
export function SessionProvider({ userName, serverPermissions, children }: { userName: string; serverPermissions: string[]; children: ReactNode }) {
  const [simulatedRoleId, setSimulatedRoleId] = useState("real");
  const { data: roles = [] } = useQuery(["roles"], () => services.roles.list());

  const permissions = useMemo<PermissionKey[]>(() => {
    if (simulatedRoleId === "real") return permissionsFromServer(serverPermissions);
    return roles.find((r) => r.id === simulatedRoleId)?.permissions ?? permissionsFromServer(serverPermissions);
  }, [simulatedRoleId, roles, serverPermissions]);

  const value = useMemo<Session>(
    () => ({ userName, simulatedRoleId, setSimulatedRoleId, roles, permissions, can: (p) => permissions.includes(p) }),
    [userName, simulatedRoleId, roles, permissions],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}
