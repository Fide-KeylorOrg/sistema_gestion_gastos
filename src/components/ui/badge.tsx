import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Tone = "success" | "warning" | "danger" | "neutral" | "info";
const tones: Record<Tone, string> = {
  success: "border-green-200 bg-green-100 text-green-700",
  warning: "border-amber-200 bg-amber-100 text-amber-700",
  danger: "border-red-200 bg-red-100 text-red-700",
  neutral: "border-slate-200 bg-slate-100 text-slate-600",
  info: "border-blue-200 bg-blue-100 text-blue-700",
};

/** Insignia de estado: padding 2/8, 12px, semibold, radio 4 (DESIGN.md). */
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}
