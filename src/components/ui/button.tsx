import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const base =
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const variants: Record<Variant, string> = {
  primary: "bg-blue-700 text-white hover:bg-blue-800 active:bg-blue-950",
  secondary: "border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "text-blue-700 hover:bg-blue-50",
};

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  variant?: Variant;
  icon?: string;
  href?: string;
  type?: "button" | "submit" | "reset";
  children?: ReactNode;
};

/** Con `href` se comporta como enlace (navegación); sin él, como botón (por defecto type="button"). */
export function Button({ variant = "primary", icon, href, className, children, type = "button", disabled, ...rest }: Props) {
  const cls = cn(base, variants[variant], className);
  const content = (
    <>
      {icon && <Icon name={icon} />}
      {children}
    </>
  );
  if (href && !disabled) {
    return (
      <Link href={href} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} disabled={disabled} {...rest}>
      {content}
    </button>
  );
}
