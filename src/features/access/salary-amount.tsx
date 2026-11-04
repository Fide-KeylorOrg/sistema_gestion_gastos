"use client";

import { formatCRC } from "@/lib/format";
import { SalaryRestricted } from "@/components/ui/feedback";
import { useSession } from "./demo-session";
import type { PermissionKey } from "./types";

/** Muestra un monto salarial solo si el rol tiene el permiso de información salarial (HU-12, 20, 26, 27, 30, 36, 57, 65). */
export function SalaryAmount({ value, permission = "planilla.infoSalarial" }: { value: number | null | undefined; permission?: PermissionKey }) {
  const { can } = useSession();
  if (!can(permission)) return <SalaryRestricted inline />;
  return <>{value === null || value === undefined ? "—" : formatCRC(value)}</>;
}

export function useCanSeeSalary(permission: PermissionKey = "planilla.infoSalarial") {
  return useSession().can(permission);
}
