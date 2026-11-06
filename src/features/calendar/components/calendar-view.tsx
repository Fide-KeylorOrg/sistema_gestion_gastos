"use client";

import Link from "next/link";
import { useState } from "react";
import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import { formatDate, formatMonthYear, toISO } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Alert, Badge, Button, DemoNotice, EmptyState, ErrorState, Icon, Loading, Modal, PageHeader, Select } from "@/components/ui";
import { useSession } from "@/features/access/demo-session";
import { DEMO_TODAY } from "@/services/demo/clock";
import { EVENT_TYPE_LABEL, EVENT_TYPE_STYLE, type CalendarEvent, type CalendarEventType } from "../types";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const TODAY = { y: +DEMO_TODAY.slice(0, 4), m: +DEMO_TODAY.slice(5, 7) - 1 };

/** HU-55 a 60: calendario mensual con tipos, filtro, detalle de fecha y alertas de 7 días. */
export function CalendarView() {
  const [ym, setYm] = useState(TODAY);
  const [type, setType] = useState<CalendarEventType | "">("");
  const [day, setDay] = useState<string | null>(null);
  const q = useQuery(["calendar", ym.y, ym.m], () => services.calendar.month(ym.y, ym.m));
  const events = (q.data ?? []).filter((e) => !type || e.type === type);
  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);

  const first = new Date(Date.UTC(ym.y, ym.m, 1));
  const offset = (first.getUTCDay() + 6) % 7; // semana inicia en lunes
  const days = new Date(Date.UTC(ym.y, ym.m + 1, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) => (i < offset || i >= offset + days ? null : i - offset + 1));
  const go = (delta: number) => setYm((c) => { const t = c.y * 12 + c.m + delta; return { y: Math.floor(t / 12), m: t % 12 }; });

  return (
    <>
      <PageHeader title="Calendario de obligaciones y eventos" subtitle="Planilla, vacaciones, incapacidades, contratos, feriados, pagos y permisos en un solo lugar." />
      <div className="mb-4"><DemoNotice /></div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon="chevron_left" aria-label="Mes anterior" onClick={() => go(-1)} />
          <h2 className="min-w-44 text-center text-lg font-semibold text-slate-900" aria-live="polite">{formatMonthYear(ym.y, ym.m)}</h2>
          <Button variant="secondary" icon="chevron_right" aria-label="Mes siguiente" onClick={() => go(1)} />
          <Button variant="secondary" onClick={() => setYm(TODAY)}>Hoy</Button>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-slate-600">Filtrar por tipo:
          <Select value={type} onChange={(e) => setType(e.target.value as CalendarEventType | "")} className="w-48" aria-label="Filtrar por tipo de fecha">
            <option value="">Todos los tipos</option>{(Object.keys(EVENT_TYPE_LABEL) as CalendarEventType[]).map((k) => <option key={k} value={k}>{EVENT_TYPE_LABEL[k]}</option>)}
          </Select>
          {type && <Button variant="ghost" className="h-8" onClick={() => setType("")}>Quitar filtro</Button>}
        </label>
      </div>

      <ul className="mb-4 flex flex-wrap gap-2 text-xs" aria-label="Leyenda de tipos">
        {(Object.keys(EVENT_TYPE_LABEL) as CalendarEventType[]).map((k) => <li key={k} className={cn("inline-flex items-center gap-1 rounded border px-2 py-0.5 font-medium", EVENT_TYPE_STYLE[k].chip)}><Icon name={EVENT_TYPE_STYLE[k].icon} className="!text-sm" />{EVENT_TYPE_LABEL[k]}</li>)}
        <li className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-0.5 font-medium text-red-700">Vencido</li>
        <li className="inline-flex items-center gap-1 rounded border border-blue-300 bg-white px-2 py-0.5 font-medium text-blue-700">Vence en 7 días o menos</li>
      </ul>

      {q.loading ? <Loading /> : q.error ? <ErrorState message={q.error} /> : (
        <>
          {events.length === 0 && <Alert tone="info" className="mb-4">No hay eventos registrados para este mes{type ? " con el tipo seleccionado" : ""}.</Alert>}
          <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white md:block">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold uppercase text-slate-500">{WEEKDAYS.map((d) => <div key={d} className="py-2">{d}</div>)}</div>
            <div className="grid grid-cols-7">
              {cells.map((d, i) => {
                const iso = d ? toISO(ym.y, ym.m, d) : "";
                const list = d ? byDay.get(iso) ?? [] : [];
                return (
                  <div key={i} className={cn("min-h-28 border-b border-r border-slate-100 p-1.5", !d && "bg-slate-50")}>
                    {d && (
                      <>
                        <button type="button" onClick={() => list.length && setDay(iso)} className={cn("mb-1 flex size-6 items-center justify-center rounded-full text-xs font-semibold", iso === DEMO_TODAY ? "bg-blue-700 text-white" : "text-slate-700")} aria-label={`${d} de ${formatMonthYear(ym.y, ym.m)}${list.length ? `, ${list.length} eventos` : ""}`}>{d}</button>
                        <ul className="space-y-1">
                          {list.slice(0, 3).map((e) => <li key={e.id}><EventChip e={e} onClick={() => setDay(iso)} /></li>)}
                          {list.length > 3 && <li><button type="button" className="text-xs font-medium text-blue-700 hover:underline" onClick={() => setDay(iso)}>+{list.length - 3} más</button></li>}
                        </ul>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 md:hidden">
            {[...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([iso, list]) => (
              <div key={iso} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="mb-2 text-sm font-semibold text-slate-900">{formatDate(iso)}</p>
                <ul className="space-y-1">{list.map((e) => <li key={e.id}><EventChip e={e} onClick={() => setDay(iso)} /></li>)}</ul>
              </div>
            ))}
          </div>
        </>
      )}

      <DayModal date={day} events={day ? byDay.get(day) ?? [] : []} onClose={() => setDay(null)} />
    </>
  );
}

function EventChip({ e, onClick }: { e: CalendarEvent; onClick: () => void }) {
  const overdue = e.dueStatus === "OVERDUE";
  return (
    <button type="button" onClick={onClick} title={`${EVENT_TYPE_LABEL[e.type]}: ${e.title}`}
      className={cn("flex w-full items-center gap-1 truncate rounded border px-1.5 py-0.5 text-left text-xs font-medium", EVENT_TYPE_STYLE[e.type].chip, overdue && "border-red-300 bg-red-50 text-red-700", e.dueSoon && "ring-2 ring-blue-500", e.dueStatus === "PAID" && "opacity-70 line-through")}>
      <Icon name={EVENT_TYPE_STYLE[e.type].icon} className="!text-sm shrink-0" /><span className="truncate">{e.title}</span>
    </button>
  );
}

function DayModal({ date, events, onClose }: { date: string | null; events: CalendarEvent[]; onClose: () => void }) {
  const { can } = useSession();
  return (
    <Modal open={!!date} onClose={onClose} size="md" title={date ? `Detalle del ${formatDate(date)}` : "Detalle"} footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}>
      {events.length === 0 ? <EmptyState message="No hay eventos en esta fecha." /> : (
        <ul className="space-y-4">
          {events.map((e) => (
            <li key={e.id} className="rounded-md border border-slate-200 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={cn("inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold", EVENT_TYPE_STYLE[e.type].chip)}><Icon name={EVENT_TYPE_STYLE[e.type].icon} className="!text-sm" />{EVENT_TYPE_LABEL[e.type]}</span>
                {e.dueStatus === "OVERDUE" && <Badge tone="danger">Vencido</Badge>}
                {e.dueSoon && <Badge tone="info">Próximo a vencer</Badge>}
                {e.dueStatus === "PAID" && <Badge tone="success">Pago registrado</Badge>}
              </div>
              <p className="font-semibold text-slate-900">{e.title}</p>
              <dl className="mt-2 space-y-1 text-sm">{e.detail.map((d) => <div key={d.label} className="flex justify-between gap-3"><dt className="text-slate-500">{d.label}</dt><dd className="text-right font-medium text-slate-900">{d.value}</dd></div>)}</dl>
              {e.workedHoliday && e.workedHoliday.length > 0 && (
                <div className="mt-2 rounded bg-slate-50 p-2 text-sm"><p className="font-semibold text-slate-800">Feriado trabajado</p><ul>{e.workedHoliday.map((w, i) => <li key={i} className="text-slate-600">{w.employeeName} · planilla {w.payrollLabel}</li>)}</ul></div>
              )}
              {e.type === "FERIADO" && !e.workedHoliday?.length && <p className="mt-2 text-xs text-slate-500">Ningún colaborador lo tiene registrado como feriado trabajado.</p>}
              {e.salaryDetail && (can("calendario.infoSalarial") ? <dl className="mt-2 space-y-1 text-sm">{e.salaryDetail.map((d) => <div key={d.label} className="flex justify-between"><dt className="text-slate-500">{d.label}</dt><dd className="font-medium text-slate-900">{d.value}</dd></div>)}</dl> : <p className="mt-2 text-xs text-slate-500">No tiene permiso para consultar los montos de remuneración.</p>)}
              {e.href && <Link href={e.href} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline">Ver registro en su módulo <Icon name="open_in_new" className="!text-base" /></Link>}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
