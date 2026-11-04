"use client";

import { useState } from "react";
import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import { formatCRC, formatDate } from "@/lib/format";
import type { FieldErrors } from "@/lib/result";
import { Alert, Badge, Button, ConfirmDialog, EmptyState, FormField, Input, Modal, Select, Table, TableWrap, Td, Textarea, Th, THead, Tr, useToast } from "@/components/ui";
import { SalaryRestricted } from "@/components/ui/feedback";
import { useSession } from "@/features/access/demo-session";
import { DEMO_TODAY } from "@/services/demo/clock";
import type { AdvanceStatus, Employee, SalaryAdvance } from "../types";
import { parseAdvanceForm } from "../validation";

const STATUS_TONE = { PENDIENTE: "warning", DESCONTADO: "success", ANULADO: "neutral" } as const;
const STATUS_LABEL: Record<AdvanceStatus, string> = { PENDIENTE: "Pendiente", DESCONTADO: "Descontado", ANULADO: "Anulado" };

/** HU-35 (registrar, modificar, anular) y HU-36 (consultar y filtrar). Requiere permiso de información salarial. */
export function AdvancesTab({ employee, records, canEdit }: { employee: Employee; records: SalaryAdvance[]; canEdit: boolean }) {
  const { can } = useSession();
  const toast = useToast();
  const [f, setF] = useState({ status: "" as AdvanceStatus | "", from: "", to: "" });
  const [form, setForm] = useState<{ record?: SalaryAdvance } | null>(null);
  const [cancelling, setCancelling] = useState<SalaryAdvance | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  if (!can("planilla.infoSalarial")) return <SalaryRestricted />;
  if (records.length === 0 && !canEdit) return <EmptyState message="No hay adelantos registrados." />;

  const shown = records.filter((a) => (!f.status || a.status === f.status) && (!f.from || a.date >= f.from) && (!f.to || a.date <= f.to));
  const pendingTotal = records.filter((a) => a.status === "PENDIENTE").reduce((s, a) => s + a.amount, 0);

  async function cancel() {
    if (!cancelling) return;
    const res = await services.employees.cancelAdvance(employee.id, cancelling.id);
    if (!res.ok) return setProblem(res.error.message);
    toast.success("Adelanto anulado; la planilla en borrador quedó pendiente de recálculo.");
    setCancelling(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <form className="grid gap-3 sm:grid-cols-3" onSubmit={(e) => e.preventDefault()}>
          <FormField id="ad-status" label="Estado"><Select id="ad-status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as AdvanceStatus | "" })}><option value="">Todos</option>{(Object.keys(STATUS_LABEL) as AdvanceStatus[]).map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}</Select></FormField>
          <FormField id="ad-from" label="Desde"><Input id="ad-from" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></FormField>
          <FormField id="ad-to" label="Hasta"><Input id="ad-to" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></FormField>
        </form>
        {canEdit && employee.active && <Button icon="add" onClick={() => setForm({})}>Registrar adelanto</Button>}
      </div>
      <p className="text-sm text-slate-600">Total pendiente por descontar: <strong className="tnum">{formatCRC(pendingTotal)}</strong></p>
      {shown.length === 0 ? <EmptyState message={records.length === 0 ? "Este empleado no tiene adelantos registrados." : "No hay adelantos para los criterios indicados."} /> : (
        <TableWrap>
          <Table caption="Adelantos salariales"><THead><Th>Fecha</Th><Th numeric>Monto</Th><Th>Período de descuento</Th><Th>Estado</Th><Th>Observación</Th><Th className="text-right">Acciones</Th></THead>
            <tbody>{shown.map((a) => (
              <Tr key={a.id}>
                <Td className="tnum">{formatDate(a.date)}</Td><Td numeric>{formatCRC(a.amount)}</Td><Td className="tnum">{a.discountPeriodLabel}</Td>
                <Td><Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge></Td><Td>{a.note ?? "—"}</Td>
                <Td className="text-right">{canEdit && a.status === "PENDIENTE" && <div className="flex justify-end gap-1"><Button variant="ghost" className="h-8 px-2" icon="edit" onClick={() => setForm({ record: a })}>Modificar</Button><Button variant="ghost" className="h-8 px-2 text-red-600" icon="block" onClick={() => { setProblem(null); setCancelling(a); }}>Anular</Button></div>}</Td>
              </Tr>))}</tbody>
          </Table>
        </TableWrap>
      )}
      <AdvanceModal state={form} employeeId={employee.id} onClose={() => setForm(null)} />
      <ConfirmDialog open={!!cancelling} title="Anular adelanto" message={`Se anulará el adelanto de ${formatCRC(cancelling?.amount ?? 0)}. Si ya fue descontado en una planilla cerrada, el cambio se bloquea.`} confirmLabel="Anular" tone="danger" onCancel={() => setCancelling(null)} onConfirm={cancel}>{problem && <Alert tone="danger">{problem}</Alert>}</ConfirmDialog>
    </div>
  );
}

function AdvanceModal({ state, employeeId, onClose }: { state: { record?: SalaryAdvance } | null; employeeId: string; onClose: () => void }) {
  const toast = useToast();
  const periods = useQuery(["advance-periods"], () => services.payroll.periodsForAdvances());
  const [v, setV] = useState({ amount: "", date: DEMO_TODAY, periodId: "", note: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const current = state ? state.record?.id ?? "new" : null;
  if (current !== key) {
    setKey(current);
    if (state) { const r = state.record; setV({ amount: r ? String(r.amount) : "", date: r?.date ?? DEMO_TODAY, periodId: r?.discountPeriodId ?? "", note: r?.note ?? "" }); setErrors({}); setGeneral(null); }
  }
  const editing = !!state?.record;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = parseAdvanceForm(v);
    setErrors(p.errors); setGeneral(null);
    if (p.amount === undefined) return;
    const input = { amount: p.amount, date: v.date, discountPeriodId: v.periodId, note: v.note.trim() || undefined };
    const res = editing ? await services.employees.updateAdvance(employeeId, state!.record!.id, input) : await services.employees.addAdvance(employeeId, input);
    if (!res.ok) { setErrors(res.error.fieldErrors ?? {}); return setGeneral(res.error.message); }
    toast.success(editing ? "Adelanto actualizado correctamente." : "Adelanto registrado; se descontará en la planilla del período indicado.");
    onClose();
  }

  return (
    <Modal open={!!state} onClose={onClose} size="sm" title={editing ? "Modificar adelanto" : "Registrar adelanto"}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="adv-form" icon="save">Guardar</Button></>}>
      <form id="adv-form" onSubmit={submit} noValidate className="space-y-4">
        {general && <Alert tone="danger">{general}</Alert>}
        <FormField id="adv-amount" label="Monto (₡)" required error={errors.amount}><Input id="adv-amount" inputMode="decimal" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} invalid={!!errors.amount} /></FormField>
        <FormField id="adv-date" label="Fecha del adelanto" required error={errors.date}><Input id="adv-date" type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} invalid={!!errors.date} /></FormField>
        <FormField id="adv-period" label="Período de descuento" required error={errors.periodId} hint="Solo planillas en borrador."><Select id="adv-period" value={v.periodId} onChange={(e) => setV({ ...v, periodId: e.target.value })} invalid={!!errors.periodId}><option value="">Seleccione…</option>{periods.data?.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</Select></FormField>
        <FormField id="adv-note" label="Observación (opcional)"><Textarea id="adv-note" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} /></FormField>
      </form>
    </Modal>
  );
}
