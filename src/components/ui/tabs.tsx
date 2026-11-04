"use client";
import { cn } from "@/lib/cn";

export function Tabs<T extends string>({ tabs, value, onChange, label }: {
  tabs: { id: T; label: string; badge?: string | number }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium",
            value === t.id ? "border-blue-700 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800",
          )}
        >
          {t.label}
          {t.badge !== undefined && <span className="tnum ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{t.badge}</span>}
        </button>
      ))}
    </div>
  );
}
