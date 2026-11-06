import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function Card({ title, subtitle, actions, children, className, padded = true }: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cn("rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_0_rgba(15,23,42,0.05)]", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
            {subtitle && <p className="text-[13px] text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(padded && "p-4")}>{children}</div>
    </section>
  );
}

export function KpiCard({ label, value, hint, href }: { label: string; value: ReactNode; hint?: ReactNode; href?: string }) {
  const body = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="tnum mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-[13px] text-slate-500">{hint}</p>}
    </>
  );
  const cls = "block rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_0_rgba(15,23,42,0.05)]";
  return href ? (
    <Link href={href} className={cn(cls, "hover:border-blue-300")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
