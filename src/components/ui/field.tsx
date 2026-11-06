import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const control =
  "block w-full rounded-md border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-500";
const ok = "border-slate-300 focus:border-blue-700";
const bad = "border-red-600 text-red-700 focus:border-red-600";

type Invalid = { invalid?: boolean };

export function Input({ invalid, className, id, ...rest }: InputHTMLAttributes<HTMLInputElement> & Invalid) {
  return (
    <input
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && id ? `${id}-error` : undefined}
      className={cn(control, "h-9", invalid ? bad : ok, className)}
      {...rest}
    />
  );
}

export function Select({ invalid, className, id, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & Invalid) {
  return (
    <select
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && id ? `${id}-error` : undefined}
      className={cn(control, "h-9 pr-8", invalid ? bad : ok, className)}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Textarea({ invalid, className, id, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & Invalid) {
  return (
    <textarea
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && id ? `${id}-error` : undefined}
      className={cn(control, "min-h-20 py-2", invalid ? bad : ok, className)}
      {...rest}
    />
  );
}

export function Checkbox({ label, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode }) {
  return (
    <label className={cn("inline-flex items-center gap-2 text-sm text-slate-700", className)}>
      <input type="checkbox" className="size-4 rounded border-slate-300 accent-blue-700" {...rest} />
      {label}
    </label>
  );
}

/** Etiqueta + control + mensaje de error. `id` debe coincidir con el id del control. */
export function FormField({
  id,
  label,
  required,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={id} className="block text-[13px] font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
