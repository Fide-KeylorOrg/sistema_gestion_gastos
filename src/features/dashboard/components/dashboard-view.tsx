"use client";

import Link from "next/link";
import { useState } from "react";
import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import { formatCRC, formatDate, monthName } from "@/lib/format";
import { Alert, Badge, Button, Card, DemoNotice, EmptyState, ErrorState, KpiCard, Loading, PageHeader, Select, Tabs } from "@/components/ui";
import { SalaryRestricted } from "@/components/ui/feedback";
import { useSession } from "@/features/access/demo-session";
import { DueStatusBadge } from "@/features/expenses/components/due-status-badge";
import { DEMO_TODAY } from "@/services/demo/clock";
import type { ComparisonMode, PeriodRef } from "../types";

/** HU-61 a 66: indicadores, próximos y vencidos, y comparaciones entre períodos. */
export function DashboardView() {
  const q = useQuery(["dashboard"], () => services.dashboard.summary());
  const { can } = useSession();

  if (q.loading) return <Loading />;
  if (q.error) return <ErrorState message={q.error} />;
  const s = q.data!;
  const total = s.activeEmployees + s.inactiveEmployees;

  return (
    <>
      <PageHeader title="Inicio" subtitle={`Resumen administrativo · fecha de referencia de la demostración: ${formatDate(DEMO_TODAY)}`} actions={can("gastos.crear") && <Button href="/gastos/nuevo" icon="add_circle">Registrar gasto</Button>} />
      <div className="mb-4"><DemoNotice /></div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Colaboradores activos" value={s.activeEmployees} href="/empleados?estado=activo" hint={total === 0 ? "No hay colaboradores registrados." : "Ver listado de activos"} />
        <KpiCard label="Colaboradores inactivos" value={s.inactiveEmployees} href="/empleados?estado=inactivo" hint={s.lastStatusChange ? `Último cambio: ${s.lastStatusChange.employeeName}, ${formatDate(s.lastStatusChange.date)}` : "Sin cambios de estado"} />
        <KpiCard label="Próximos 7 días" value={s.upcoming.length} hint="Pagos y obligaciones por vencer" />
        <KpiCard label="Vencidos" value={s.overdue.length} hint={s.overdue.length ? "Requieren atención" : "No hay obligaciones vencidas."} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3" title="Próximos pagos y obligaciones pendientes" subtitle="Dentro de los próximos 7 días, de la fecha más cercana a la más lejana" padded={false}>
          {s.upcoming.length === 0 ? <EmptyState message="No hay pagos ni obligaciones pendientes en los próximos 7 días." /> : (
            <ul className="divide-y divide-slate-100">
              {s.upcoming.map((u) => u.kind === "EXPENSE" ? (
                <li key={u.row.due.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div><div className="mb-1 flex flex-wrap items-center gap-2"><span className="tnum rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">{formatDate(u.row.due.dueDate)}</span><DueStatusBadge row={u.row} /></div>
                    <p className="font-semibold text-slate-900">{u.row.expense.concept}</p><p className="text-xs text-slate-500">{u.row.categoryName}</p></div>
                  <div className="text-right"><p className="tnum font-bold text-slate-900">{formatCRC(u.row.due.estimatedAmount)}</p><Link className="text-sm font-medium text-blue-700 hover:underline" href={`/gastos/${u.row.due.id}`}>Ver detalle</Link></div>
                </li>
              ) : (
                <li key={u.payrollId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div><div className="mb-1 flex items-center gap-2"><span className="tnum rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">{formatDate(u.date)}</span><Badge tone="info">Pago de planilla</Badge></div>
                    <p className="font-semibold text-slate-900">{u.label}</p><p className="text-xs text-slate-500">{u.employeeCount} colaboradores</p></div>
                  <div className="text-right"><p className="tnum font-bold text-slate-900">{can("dashboard.infoSalarial") ? formatCRC(u.total ?? 0) : <SalaryRestricted inline />}</p>
                    {can("planilla.consultar") && can("dashboard.infoSalarial") ? <Link className="text-sm font-medium text-blue-700 hover:underline" href={`/planilla/${u.payrollId}`}>Ver detalle</Link> : <span className="text-xs text-slate-500">Sin permiso para ver el detalle salarial</span>}</div>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-slate-100 px-4 py-3 text-center text-[13px]"><Link href="/calendario" className="font-medium text-blue-700 hover:underline">Ver todas las obligaciones en el calendario</Link></div>
        </Card>

        <Card className="border-red-200 xl:col-span-2" title="Vencidos" subtitle="Obligaciones y permisos fuera de plazo" padded={false}>
          {s.overdue.length === 0 ? <EmptyState message="No hay obligaciones vencidas." /> : (
            <ul className="divide-y divide-slate-100">
              {s.overdue.map((r) => (
                <li key={r.due.id} className="px-4 py-3">
                  <div className="mb-1 flex flex-wrap items-center gap-2"><span className="tnum rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">{formatDate(r.due.dueDate)}</span><Badge tone="danger">Vencido hace {Math.abs(r.daysToDue)} días</Badge>{r.expense.kind === "PERMIT" && <Badge tone="neutral">Permiso</Badge>}</div>
                  <div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-slate-900">{r.expense.concept}</p><p className="text-xs text-slate-500">{r.categoryName}</p></div>
                    <div className="text-right"><p className="tnum font-bold text-slate-900">{formatCRC(r.due.estimatedAmount)}</p><Link className="text-sm font-medium text-blue-700 hover:underline" href={`/gastos/${r.due.id}`}>{r.expense.kind === "PERMIT" ? "Subsanar" : "Pagar"}</Link></div></div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6"><Comparison /></div>
    </>
  );
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i);
const Y = +DEMO_TODAY.slice(0, 4);
const M = +DEMO_TODAY.slice(5, 7) - 1;

function Comparison() {
  const { can } = useSession();
  const [mode, setMode] = useState<ComparisonMode>("MONTH");
  const [tab, setTab] = useState<"gastos" | "planilla">("gastos");
  const [a, setA] = useState<PeriodRef>(M === 0 ? { year: Y - 1, month: 11 } : { year: Y, month: M - 1 });
  const [b, setB] = useState<PeriodRef>({ year: Y, month: M });
  const years = [Y - 1, Y, Y + 1];
  const set = (which: "a" | "b", patch: Partial<PeriodRef>) => (which === "a" ? setA({ ...a, ...patch }) : setB({ ...b, ...patch }));
  const same = mode === "YEAR" ? a.year === b.year : a.year === b.year && a.month === b.month;

  return (
    <Card title="Comparar períodos" subtitle="Análisis comparativo de gastos administrativos y planilla"
      actions={<div role="group" aria-label="Tipo de comparación" className="inline-flex rounded-md border border-slate-300 p-0.5">{(["MONTH", "YEAR"] as ComparisonMode[]).map((m) => <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`rounded px-3 py-1 text-sm font-medium ${mode === m ? "bg-blue-700 text-white" : "text-slate-600"}`}>{m === "MONTH" ? "Mes" : "Año"}</button>)}</div>}>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Picker label="Período A" mode={mode} value={a} years={years} onChange={(p) => set("a", p)} id="pa" />
        <span className="pb-2 text-sm text-slate-500">vs</span>
        <Picker label="Período B" mode={mode} value={b} years={years} onChange={(p) => set("b", p)} id="pb" />
      </div>
      {same && <Alert tone="warning" className="mb-4">Seleccione dos períodos distintos para comparar.</Alert>}
      <Tabs label="Tipo de comparación" value={tab} onChange={setTab} tabs={[{ id: "gastos", label: "Gastos administrativos" }, { id: "planilla", label: can("dashboard.infoSalarial") ? "Costo de planilla y horas extra" : "Costo de planilla y horas extra (restringido)" }]} />
      <div className="mt-4">{tab === "gastos" ? <ExpenseComparisonPanel mode={mode} a={a} b={b} /> : can("dashboard.infoSalarial") ? <PayrollComparisonPanel mode={mode} a={a} b={b} /> : <SalaryRestricted />}</div>
    </Card>
  );
}

function Picker({ label, mode, value, years, onChange, id }: { label: string; mode: ComparisonMode; value: PeriodRef; years: number[]; onChange: (p: Partial<PeriodRef>) => void; id: string }) {
  return (
    <div className="flex items-end gap-2">
      {mode === "MONTH" && <div><label htmlFor={`${id}-m`} className="mb-1 block text-[13px] font-medium text-slate-700">{label}: mes</label><Select id={`${id}-m`} className="w-40" value={value.month} onChange={(e) => onChange({ month: +e.target.value })}>{MONTHS.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}</Select></div>}
      <div><label htmlFor={`${id}-y`} className="mb-1 block text-[13px] font-medium text-slate-700">{mode === "MONTH" ? "Año" : label}</label><Select id={`${id}-y`} className="w-28" value={value.year} onChange={(e) => onChange({ year: +e.target.value })}>{years.map((y) => <option key={y}>{y}</option>)}</Select></div>
    </div>
  );
}

function ExpenseComparisonPanel({ mode, a, b }: { mode: ComparisonMode; a: PeriodRef; b: PeriodRef }) {
  const q = useQuery(["cmp-exp", mode, a, b], () => services.dashboard.compareExpenses(mode, a, b));
  if (q.loading) return <Loading />;
  if (q.error || !q.data) return <ErrorState message={q.error ?? "Sin datos"} />;
  const c = q.data;
  const max = Math.max(1, ...c.byCategory.flatMap((x) => [x.a, x.b]));
  const pct = c.totalA > 0 ? (c.difference / c.totalA) * 100 : null;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat l={`Total ${c.labelA}`} v={formatCRC(c.totalA)} note={c.emptyA ? "Sin gastos registrados en este período." : undefined} />
        <Stat l={`Total ${c.labelB}`} v={formatCRC(c.totalB)} note={c.emptyB ? "Sin gastos registrados en este período." : undefined} />
        <Stat l="Diferencia" v={`${c.difference >= 0 ? "+" : "−"}${formatCRC(Math.abs(c.difference))}`} note={pct === null ? undefined : `${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(1)}%`} tone={c.difference > 0 ? "danger" : "ok"} />
      </div>
      {c.byCategory.length > 0 && (
        <div className="space-y-3" role="list" aria-label="Distribución por categoría">
          {c.byCategory.map((r) => (
            <div key={r.category} role="listitem">
              <div className="mb-1 flex flex-wrap justify-between gap-2 text-sm"><span className="font-medium text-slate-800">{r.category}</span><span className="tnum text-slate-500">{formatCRC(r.a)} vs {formatCRC(r.b)}</span></div>
              <div className="space-y-1">
                <Bar label={c.labelA} value={r.a} max={max} className="bg-slate-400" /><Bar label={c.labelB} value={r.b} max={max} className="bg-blue-700" />
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end"><Button variant="secondary" icon="open_in_new" href="/gastos">Ver detalle de gastos comparados</Button></div>
    </div>
  );
}

function PayrollComparisonPanel({ mode, a, b }: { mode: ComparisonMode; a: PeriodRef; b: PeriodRef }) {
  const q = useQuery(["cmp-pay", mode, a, b], () => services.dashboard.comparePayroll(mode, a, b));
  if (q.loading) return <Loading />;
  if (q.error || !q.data) return <ErrorState message={q.error ?? "Sin datos"} />;
  const c = q.data;
  return (
    <div className="space-y-4">
      <Alert tone="info">Definición de «costo de planilla» pendiente de confirmar con la administración; la demostración usa el salario bruto acumulado de ejemplo.</Alert>
      <div className="grid gap-6 sm:grid-cols-2"><PayrollColumn label={c.labelA} d={c.a} /><PayrollColumn label={c.labelB} d={c.b} /></div>
      <div className="flex justify-end"><Button variant="secondary" icon="open_in_new" href="/planilla">Ver planillas</Button></div>
    </div>
  );
}

function PayrollColumn({ label, d }: { label: string; d: { cost: number; overtimeHours: number } | null }) {
  return d ? (
    <div className="space-y-3"><p className="font-semibold text-slate-900">{label}</p>
      <Stat l="Costo de planilla (ejemplo)" v={formatCRC(d.cost)} /><Stat l="Horas extra" v={`${d.overtimeHours} h`} /></div>
  ) : <div className="space-y-3"><p className="font-semibold text-slate-900">{label}</p><Alert tone="warning">Este período no tiene planilla registrada.</Alert></div>;
}

const Stat = ({ l, v, note, tone }: { l: string; v: string; note?: string; tone?: "danger" | "ok" }) => (
  <div className={`rounded-lg border p-3 ${tone === "danger" ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
    <p className="text-xs text-slate-500">{l}</p><p className="tnum text-lg font-bold text-slate-900">{v}</p>{note && <p className="text-xs text-slate-500">{note}</p>}
  </div>
);

function Bar({ label, value, max, className }: { label: string; value: number; max: number; className: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 truncate text-xs text-slate-500">{label}</span>
      <div className="h-3 flex-1 rounded bg-slate-100"><div className={`h-3 rounded ${className}`} style={{ width: `${(value / max) * 100}%` }} /></div>
    </div>
  );
}
