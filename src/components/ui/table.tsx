import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("overflow-x-auto rounded-lg border border-slate-200 bg-white", className)}>{children}</div>;
}
export function Table({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <table className="w-full min-w-[640px] border-collapse text-left text-sm">
      {caption && <caption className="sr-only">{caption}</caption>}
      {children}
    </table>
  );
}
export const THead = ({ children }: { children: ReactNode }) => (
  <thead className="border-b border-slate-200 bg-slate-50">
    <tr>{children}</tr>
  </thead>
);
export function Th({ className, numeric, ...rest }: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cn("px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500", numeric && "text-right", className)}
      {...rest}
    />
  );
}
export function Td({ className, numeric, ...rest }: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return <td className={cn("border-b border-slate-100 px-4 py-3 align-middle", numeric && "tnum text-right", className)} {...rest} />;
}
export const Tr = ({ children, className }: { children: ReactNode; className?: string }) => (
  <tr className={cn("hover:bg-slate-50", className)}>{children}</tr>
);

export function Pagination({ page, totalPages, total, pageSize, onPage }: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-2 px-1 pt-3 text-[13px] text-slate-500">
      <span>
        Mostrando {from}–{to} de {total}
      </span>
      <span className="flex items-center gap-2">
        <Button variant="secondary" className="h-8 px-3" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Anterior
        </Button>
        <span className="tnum">
          {page} / {totalPages}
        </span>
        <Button variant="secondary" className="h-8 px-3" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Siguiente
        </Button>
      </span>
    </nav>
  );
}
