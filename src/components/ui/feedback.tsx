import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

const toneStyles = {
  info: "border-blue-200 bg-blue-50 text-blue-900",
  success: "border-green-200 bg-green-50 text-green-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-900",
} as const;
const toneIcon = { info: "info", success: "check_circle", warning: "warning", danger: "error" } as const;

export function Alert({ tone = "info", title, children, className }: {
  tone?: keyof typeof toneStyles;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-md border p-3 text-[13px]", toneStyles[tone], className)}>
      <Icon name={toneIcon[tone]} className="mt-0.5 shrink-0" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}

/** Marca visible de que lo mostrado son datos de demostración (no vienen de la base de datos). */
export function DemoNotice() {
  return null;
}

/** Dato que debe calcular o validar el servidor; se muestra un ejemplo rotulado, no un cálculo real. */
export function ServerPending({ children }: { children?: ReactNode }) {
  return (
    <Alert tone="info" title="Pendiente del servidor">
      {children ?? "Este valor lo calculará el backend. Se muestra un ejemplo ilustrativo."}
    </Alert>
  );
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <Icon name="inbox" className="!text-4xl text-slate-300" />
      <p className="text-sm text-slate-500">{message}</p>
      {action}
    </div>
  );
}

export function Loading({ label = "Cargando…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-10 text-sm text-slate-500">
      <span className="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700" />
      {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return <Alert tone="danger" title="No se pudo completar la consulta">{message}</Alert>;
}

/** Sustituye montos cuando el rol no tiene el permiso de información salarial (HU-12, 20, 27, 30, 36, 57, 65, 66). */
export function SalaryRestricted({ inline }: { inline?: boolean }) {
  return inline ? (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      <Icon name="lock" className="!text-sm" /> Restringido
    </span>
  ) : (
    <Alert tone="warning" title="Información salarial restringida">
      No tiene permiso para consultar información salarial.
    </Alert>
  );
}
