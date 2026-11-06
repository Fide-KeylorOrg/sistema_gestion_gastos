import { cn } from "@/lib/cn";

/** Material Symbols Outlined (fuente cargada en app/layout.tsx). Ver nombres en fonts.google.com/icons. */
export function Icon({ name, className, filled }: { name: string; className?: string; filled?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn("material-symbols-outlined", className)}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  );
}
