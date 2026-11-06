"use client";

import Link from "next/link";
import { useState } from "react";
import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import { usePagination } from "@/lib/use-pagination";
import { formatCRC, formatDate, formatMonthYear, monthName } from "@/lib/format";
import { Button, Card, DemoNotice, EmptyState, ErrorState, FormField, Input, Loading, PageHeader, Pagination, Select, Table, TableWrap, Tabs, Td, Th, THead, Tr } from "@/components/ui";
import { useSession } from "@/features/access/demo-session";
import { DueStatusBadge } from "./due-status-badge";
import { RECURRENCE_LABEL, type DueFilters, type DueStatus } from "../types";

const EMPTY = { search: "", categoryId: "", status: "" as DueStatus | "", from: "", to: "", year: "", month: "" };

export function ExpensesListView() {
  const [tab, setTab] = useState<"active" | "history">("active");
  const [f, setF] = useState(EMPTY);
  const { can } = useSession();
  const categories = useQuery(["categories"], () => services.expenses.listCategories());

  const filters: DueFilters = {
    tab, search: f.search, categoryId: f.categoryId || undefined, status: f.status,
    from: tab === "active" ? f.from || undefined : undefined, to: tab === "active" ? f.to || undefined : undefined,
    periodYear: tab === "history" && f.year ? +f.year : undefined, periodMonth: tab === "history" && f.year && f.month !== "" ? +f.month : undefined,
  };
  const rows = useQuery(["dues", filters], () => services.expenses.listDues(filters));
  const pager = usePagination(rows.data ?? [], 10);
  const clear = () => setF(EMPTY);
  const years = [2025, 2026, 2027];

  return (
    <>
      <PageHeader title="Gastos y obligaciones" subtitle="Compromisos económicos del negocio, su vencimiento y su estado." actions={can("gastos.crear") && <Button href="/gastos/nuevo" icon="add_circle">Registrar gasto</Button>} />
      <div className="mb-4"><DemoNotice /></div>

      <Card padded={false}>
        <div className="px-4 pt-2">
          <Tabs label="Vista de gastos" value={tab} onChange={(t) => { setTab(t); setF(EMPTY); }} tabs={[{ id: "active", label: "Activos" }, { id: "history", label: "Historial" }]} />
        </div>
        <form className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-3 xl:grid-cols-6" onSubmit={(e) => e.preventDefault()} role="search">
          <FormField id="g-search" label="Búsqueda rápida" className="xl:col-span-2"><Input id="g-search" value={f.search} onChange={(e) => setF({ ...f, search: e.target.value })} placeholder="Concepto o referencia" /></FormField>
          <FormField id="g-cat" label="Categoría">
            <Select id="g-cat" value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}>
              <option value="">Todas</option>
              {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FormField>
          {tab === "active" ? (
            <>
              <FormField id="g-status" label="Estado">
                <Select id="g-status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as DueStatus | "" })}>
                  <option value="">Todos</option><option value="PENDING">Pendiente</option><option value="OVERDUE">Vencido</option>
                </Select>
              </FormField>
              <FormField id="g-from" label="Vence desde"><Input id="g-from" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></FormField>
              <FormField id="g-to" label="Vence hasta"><Input id="g-to" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></FormField>
            </>
          ) : (
            <>
              <FormField id="g-year" label="Año">
                <Select id="g-year" value={f.year} onChange={(e) => setF({ ...f, year: e.target.value, month: e.target.value ? f.month : "" })}>
                  <option value="">Todos</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}
                </Select>
              </FormField>
              <FormField id="g-month" label="Mes">
                <Select id="g-month" value={f.month} disabled={!f.year} onChange={(e) => setF({ ...f, month: e.target.value })}>
                  <option value="">Todo el año</option>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{monthName(i)}</option>)}
                </Select>
              </FormField>
            </>
          )}
          <div className="flex items-end md:col-span-3 xl:col-span-6"><Button variant="secondary" icon="filter_alt_off" onClick={clear}>Limpiar filtros</Button></div>
        </form>

        <div className="p-4">
          {rows.loading ? <Loading /> : rows.error ? <ErrorState message={rows.error} /> : pager.total === 0 ? (
            <EmptyState message={tab === "history" && (f.year || f.month) ? "No hay información disponible para el período seleccionado." : "No existen resultados para los criterios indicados."} />
          ) : (
            <>
              <TableWrap>
                <Table caption={tab === "active" ? "Gastos activos" : "Historial de gastos"}>
                  <THead><Th>Concepto</Th><Th>Categoría</Th><Th numeric>{tab === "history" ? "Monto pagado" : "Monto estimado"}</Th><Th>Vencimiento</Th>{tab === "history" && <Th>Fecha de pago</Th>}<Th>Recurrencia</Th><Th>Estado</Th><Th className="text-right">Acciones</Th></THead>
                  <tbody>
                    {pager.pageItems.map((r) => (
                      <Tr key={r.due.id}>
                        <Td className="font-medium text-slate-900">{r.expense.concept}{r.expense.kind === "PERMIT" && <span className="ml-2 text-xs font-normal text-slate-500">(permiso)</span>}</Td>
                        <Td>{r.categoryName}</Td>
                        <Td numeric>{formatCRC(r.due.paidAmount ?? r.due.estimatedAmount)}</Td>
                        <Td className="tnum whitespace-nowrap">{formatDate(r.due.dueDate)}</Td>
                        {tab === "history" && <Td className="tnum whitespace-nowrap">{formatDate(r.due.paidAt)}</Td>}
                        <Td>{RECURRENCE_LABEL[r.expense.recurrence]}</Td>
                        <Td><DueStatusBadge row={r} /></Td>
                        <Td className="text-right"><Link href={`/gastos/${r.due.id}`} className="font-medium text-blue-700 hover:underline">Ver detalle</Link></Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
              <Pagination {...pager} onPage={pager.setPage} />
            </>
          )}
          {tab === "history" && f.year && <p className="mt-2 text-xs text-slate-500">Período: {f.month !== "" ? formatMonthYear(+f.year, +f.month) : f.year}</p>}
        </div>
      </Card>
    </>
  );
}
