"use client";

import { useState } from "react";
import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import { usePagination } from "@/lib/use-pagination";
import { formatDateTime } from "@/lib/format";
import { Alert, Button, Card, DemoNotice, EmptyState, ErrorState, FormField, Input, Loading, PageHeader, Pagination, Select, Table, TableWrap, Td, Th, THead, Tr } from "@/components/ui";
import { AUDIT_ACTION_LABEL, type AuditAction, type AuditFilters } from "../types";

export function AuditView() {
  const [f, setF] = useState<AuditFilters>({ actorId: "", action: "", from: "", to: "" });
  const entries = useQuery(["audit", f], () => services.audit.list({ ...f, from: f.from || undefined, to: f.to || undefined }));
  const users = useQuery(["users-all"], () => services.users.list({}));
  const pager = usePagination(entries.data ?? [], 10);
  const clear = () => setF({ actorId: "", action: "", from: "", to: "" });
  const rangeInvalid = !!f.from && !!f.to && f.to < f.from;

  return (
    <>
      <PageHeader title="Bitácora de actividad" subtitle="Accesos y cambios de usuarios, roles, estados y contraseñas. Es de solo lectura." />
      <div className="mb-4 space-y-3">
        <DemoNotice />
        <Alert tone="info" title="Registros protegidos">La bitácora no ofrece modificar ni eliminar registros; se conservan sin cambios (a nivel de base de datos ya es de solo inserción).</Alert>
      </div>
      <Card padded={false}>
        <form className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_160px_160px_auto]" onSubmit={(e) => e.preventDefault()}>
          <FormField id="a-user" label="Usuario">
            <Select id="a-user" value={f.actorId} onChange={(e) => setF({ ...f, actorId: e.target.value })}>
              <option value="">Todos</option>
              {users.data?.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </Select>
          </FormField>
          <FormField id="a-action" label="Tipo de acción">
            <Select id="a-action" value={f.action} onChange={(e) => setF({ ...f, action: e.target.value as AuditAction | "" })}>
              <option value="">Todas</option>
              {(Object.keys(AUDIT_ACTION_LABEL) as AuditAction[]).map((a) => <option key={a} value={a}>{AUDIT_ACTION_LABEL[a]}</option>)}
            </Select>
          </FormField>
          <FormField id="a-from" label="Desde"><Input id="a-from" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></FormField>
          <FormField id="a-to" label="Hasta" error={rangeInvalid ? "Debe ser posterior a la fecha inicial." : undefined}><Input id="a-to" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} invalid={rangeInvalid} /></FormField>
          <div className="flex items-end"><Button variant="secondary" icon="filter_alt_off" onClick={clear}>Limpiar filtros</Button></div>
        </form>
        <div className="p-4">
          {entries.loading ? <Loading /> : entries.error ? <ErrorState message={entries.error} /> : pager.total === 0 ? (
            <EmptyState message="No hay registros para los criterios indicados." />
          ) : (
            <>
              <TableWrap>
                <Table caption="Bitácora de actividad">
                  <THead><Th>Fecha y hora</Th><Th>Persona</Th><Th>Acción</Th><Th>Usuario o rol afectado</Th><Th>Detalle</Th></THead>
                  <tbody>
                    {pager.pageItems.map((a) => (
                      <Tr key={a.id}>
                        <Td className="tnum whitespace-nowrap">{formatDateTime(a.at)}</Td>
                        <Td className="font-medium text-slate-900">{a.actorName}</Td>
                        <Td>{AUDIT_ACTION_LABEL[a.action]}</Td>
                        <Td>{a.target ?? "—"}</Td>
                        <Td className="text-slate-600">{a.detail}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
              <Pagination {...pager} onPage={pager.setPage} />
            </>
          )}
        </div>
      </Card>
    </>
  );
}
