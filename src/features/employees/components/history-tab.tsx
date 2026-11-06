"use client";

import { useState } from "react";
import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import { usePagination } from "@/lib/use-pagination";
import { formatDate } from "@/lib/format";
import { Alert, Button, EmptyState, ErrorState, FormField, Input, Loading, Pagination, Select, Table, TableWrap, Td, Th, THead, Tr } from "@/components/ui";
import { SalaryAmount } from "@/features/access/salary-amount";
import { WORK_HISTORY_LABEL, type WorkHistoryType } from "../types";

/** HU-30: del más reciente al más antiguo, paginado y filtrable. Solo lectura: no existe modificar ni eliminar. */
export function HistoryTab({ employeeId }: { employeeId: string }) {
  const [f, setF] = useState({ type: "" as WorkHistoryType | "", from: "", to: "" });
  const q = useQuery(["history", employeeId, f], () => services.employees.history(employeeId, { type: f.type, from: f.from || undefined, to: f.to || undefined }));
  const pager = usePagination(q.data ?? [], 8);
  const clear = () => setF({ type: "", from: "", to: "" });
  return (
    <div className="space-y-4">
      <Alert tone="info">Los movimientos del historial son de solo lectura: la aplicación no permite modificarlos ni eliminarlos.</Alert>
      <form className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]" onSubmit={(e) => e.preventDefault()}>
        <FormField id="h-type" label="Tipo de movimiento"><Select id="h-type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as WorkHistoryType | "" })}><option value="">Todos</option>{(Object.keys(WORK_HISTORY_LABEL) as WorkHistoryType[]).map((k) => <option key={k} value={k}>{WORK_HISTORY_LABEL[k]}</option>)}</Select></FormField>
        <FormField id="h-from" label="Desde"><Input id="h-from" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></FormField>
        <FormField id="h-to" label="Hasta"><Input id="h-to" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></FormField>
        <div className="flex items-end"><Button variant="secondary" icon="filter_alt_off" onClick={clear}>Limpiar</Button></div>
      </form>
      {q.loading ? <Loading /> : q.error ? <ErrorState message={q.error} /> : pager.total === 0 ? <EmptyState message="No hay movimientos para los criterios indicados." /> : (
        <>
          <TableWrap>
            <Table caption="Historial laboral">
              <THead><Th>Fecha</Th><Th>Tipo</Th><Th>Detalle</Th><Th numeric>Monto salarial</Th><Th>Registrado por</Th></THead>
              <tbody>{pager.pageItems.map((h) => (
                <Tr key={h.id}><Td className="tnum whitespace-nowrap">{formatDate(h.date)}</Td><Td>{WORK_HISTORY_LABEL[h.type]}</Td><Td>{h.detail}</Td><Td numeric>{h.amount !== undefined ? <SalaryAmount value={h.amount} /> : "—"}</Td><Td>{h.actorName}</Td></Tr>
              ))}</tbody>
            </Table>
          </TableWrap>
          <Pagination {...pager} onPage={pager.setPage} />
        </>
      )}
    </div>
  );
}
