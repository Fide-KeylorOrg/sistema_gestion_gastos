"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import { usePagination } from "@/lib/use-pagination";
import { formatDate } from "@/lib/format";
import type { FieldErrors } from "@/lib/result";
import { Alert, Button, Card, DemoNotice, EmptyState, ErrorState, FormField, Input, Loading, Modal, PageHeader, Pagination, Select, ServerPending, Table, TableWrap, Td, Th, THead, Tr, useToast } from "@/components/ui";
import { useSession } from "@/features/access/demo-session";
import { SalaryAmount } from "@/features/access/salary-amount";
import { validatePayrollPeriod } from "../validation";
import { PayrollStatusBadge } from "./payroll-parts";
import { PAYROLL_STATUS_LABEL, type PayrollStatus } from "../types";

export function PayrollListView() {
  const [f, setF] = useState({ from: "", to: "", status: "" as PayrollStatus | "" });
  const [creating, setCreating] = useState(false);
  const { can } = useSession();
  const rows = useQuery(["payrolls", f], () => services.payroll.list({ from: f.from || undefined, to: f.to || undefined, status: f.status }));
  const pager = usePagination(rows.data ?? [], 8);

  return (
    <>
      <PageHeader title="Planillas" subtitle="Planillas quincenales por período." actions={can("planilla.crear") && <Button icon="add" onClick={() => setCreating(true)}>Crear planilla</Button>} />
      <div className="mb-4 space-y-3"><DemoNotice /><ServerPending>Los montos de las planillas los calculará el servidor con las reglas aprobadas. Aquí se muestran valores de ejemplo.</ServerPending></div>
      <div className="grid gap-6">
        <ConsultPeriod />
        <Card padded={false} title="Historial de planillas">
          <form className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[180px_180px_180px_auto]" onSubmit={(e) => e.preventDefault()}>
            <FormField id="pl-from" label="Desde"><Input id="pl-from" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></FormField>
            <FormField id="pl-to" label="Hasta"><Input id="pl-to" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></FormField>
            <FormField id="pl-status" label="Estado"><Select id="pl-status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as PayrollStatus | "" })}><option value="">Todos</option>{(Object.keys(PAYROLL_STATUS_LABEL) as PayrollStatus[]).map((k) => <option key={k} value={k}>{PAYROLL_STATUS_LABEL[k]}</option>)}</Select></FormField>
            <div className="flex items-end"><Button variant="secondary" icon="filter_alt_off" onClick={() => setF({ from: "", to: "", status: "" })}>Limpiar</Button></div>
          </form>
          <div className="p-4">
            {rows.loading ? <Loading /> : rows.error ? <ErrorState message={rows.error} /> : pager.total === 0 ? <EmptyState message="No hay planillas para los criterios indicados." /> : (
              <>
                <TableWrap><Table caption="Planillas">
                  <THead><Th>Período</Th><Th>Fecha inicial</Th><Th>Fecha final</Th><Th numeric>Colaboradores</Th><Th numeric>Total neto</Th><Th>Estado</Th><Th className="text-right">Acciones</Th></THead>
                  <tbody>{pager.pageItems.map((p) => (
                    <Tr key={p.id}>
                      <Td className="font-medium text-slate-900">Quincena {formatDate(p.periodStart).slice(0, 5)} – {formatDate(p.periodEnd).slice(0, 5)}</Td>
                      <Td className="tnum">{formatDate(p.periodStart)}</Td><Td className="tnum">{formatDate(p.periodEnd)}</Td><Td numeric>{p.employeeCount}</Td>
                      <Td numeric><SalaryAmount value={p.totals.net} /></Td><Td><PayrollStatusBadge status={p.status} /></Td>
                      <Td className="text-right"><Link href={`/planilla/${p.id}`} className="font-medium text-blue-700 hover:underline">Consultar</Link></Td>
                    </Tr>))}</tbody>
                </Table></TableWrap>
                <Pagination {...pager} onPage={pager.setPage} />
              </>
            )}
          </div>
        </Card>
      </div>
      <CreateModal open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

/** HU-17 escenarios 1 y 3: consultar la planilla de un período exacto. */
function ConsultPeriod() {
  const router = useRouter();
  const [v, setV] = useState({ periodStart: "", periodEnd: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [none, setNone] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setNone(false);
    const local = validatePayrollPeriod(v);
    setErrors(local);
    if (Object.keys(local).length) return;
    const all = await services.payroll.list({});
    const hit = all.find((p) => p.periodStart === v.periodStart && p.periodEnd === v.periodEnd);
    if (hit) router.push(`/planilla/${hit.id}`);
    else setNone(true);
  }
  return (
    <Card title="Consultar un período">
      <form onSubmit={submit} noValidate className="grid gap-3 md:grid-cols-[200px_200px_auto]">
        <FormField id="cp-start" label="Fecha inicial" required error={errors.periodStart}><Input id="cp-start" type="date" value={v.periodStart} onChange={(e) => setV({ ...v, periodStart: e.target.value })} invalid={!!errors.periodStart} /></FormField>
        <FormField id="cp-end" label="Fecha final" required error={errors.periodEnd}><Input id="cp-end" type="date" value={v.periodEnd} onChange={(e) => setV({ ...v, periodEnd: e.target.value })} invalid={!!errors.periodEnd} /></FormField>
        <div className="flex items-end"><Button type="submit" icon="search">Consultar</Button></div>
      </form>
      {none && <Alert tone="warning" className="mt-3">No hay una planilla registrada para este período.</Alert>}
    </Card>
  );
}

function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState({ periodStart: "", periodEnd: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) { setWasOpen(open); if (open) { setV({ periodStart: "", periodEnd: "" }); setErrors({}); setGeneral(null); } }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const local = validatePayrollPeriod(v);
    setErrors(local); setGeneral(null);
    if (Object.keys(local).length) return;
    const res = await services.payroll.create(v);
    if (!res.ok) { setErrors(res.error.fieldErrors ?? {}); return setGeneral(res.error.message); }
    toast.success("Planilla creada correctamente.");
    onClose();
    router.push(`/planilla/${res.data.id}`);
  }
  return (
    <Modal open={open} onClose={onClose} size="sm" title="Crear nueva planilla" subtitle="Se crea en borrador; el servidor calcula ingresos, deducciones y neto de cada empleado."
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="pl-create" icon="add_circle">Crear planilla</Button></>}>
      <form id="pl-create" onSubmit={submit} noValidate className="space-y-4">
        {general && <Alert tone="danger">{general}</Alert>}
        <FormField id="pc-start" label="Fecha inicial" required error={errors.periodStart}><Input id="pc-start" type="date" value={v.periodStart} onChange={(e) => setV({ ...v, periodStart: e.target.value })} invalid={!!errors.periodStart} /></FormField>
        <FormField id="pc-end" label="Fecha final" required error={errors.periodEnd}><Input id="pc-end" type="date" value={v.periodEnd} onChange={(e) => setV({ ...v, periodEnd: e.target.value })} invalid={!!errors.periodEnd} /></FormField>
      </form>
    </Modal>
  );
}
