"use client";

import { useState } from "react";
import { services } from "@/services";
import { formatBytes, formatDate } from "@/lib/format";
import type { FieldErrors } from "@/lib/result";
import { Alert, Badge, Button, ConfirmDialog, EmptyState, FileInput, FormField, Input, Modal, Select, Table, TableWrap, Td, Th, THead, Tr, useToast } from "@/components/ui";
import { DEMO_TODAY } from "@/services/demo/clock";
import { DISABILITY_TYPE_LABEL, type DisabilityRecord, type DisabilityType, type Employee, type VacationRecord } from "../types";
import { validateDateRange } from "../validation";

/** HU-31: registrar, modificar y anular vacaciones. */
export function VacationsTab({ employee, records, canEdit }: { employee: Employee; records: VacationRecord[]; canEdit: boolean }) {
  const toast = useToast();
  const [form, setForm] = useState<{ record?: VacationRecord } | null>(null);
  const [cancelling, setCancelling] = useState<VacationRecord | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function cancel() {
    if (!cancelling) return;
    const res = await services.employees.cancelVacation(employee.id, cancelling.id);
    if (!res.ok) return setProblem(res.error.message);
    toast.success("Vacaciones anuladas; el saldo fue restituido.");
    setCancelling(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">Saldo disponible: <strong className="tnum">{employee.vacationBalanceDays} días</strong> <span className="text-xs text-slate-500">(cómputo de días: regla pendiente del servidor)</span></p>
        {canEdit && employee.active && <Button icon="add" onClick={() => setForm({})}>Registrar vacaciones</Button>}
      </div>
      {records.length === 0 ? <EmptyState message="No hay vacaciones registradas." /> : (
        <TableWrap>
          <Table caption="Vacaciones"><THead><Th>Inicio</Th><Th>Fin</Th><Th numeric>Días</Th><Th>Estado</Th><Th className="text-right">Acciones</Th></THead>
            <tbody>{records.map((v) => (
              <Tr key={v.id}>
                <Td className="tnum">{formatDate(v.start)}</Td><Td className="tnum">{formatDate(v.end)}</Td><Td numeric>{v.days}</Td>
                <Td>{v.cancelled ? <Badge tone="neutral">Anulada</Badge> : v.payrollClosed ? <Badge tone="info">Planilla cerrada</Badge> : <Badge tone="success">Registrada</Badge>}</Td>
                <Td className="text-right">{canEdit && !v.cancelled && <div className="flex justify-end gap-1"><Button variant="ghost" className="h-8 px-2" icon="edit" onClick={() => setForm({ record: v })}>Modificar</Button><Button variant="ghost" className="h-8 px-2 text-red-600" icon="event_busy" onClick={() => { setProblem(null); setCancelling(v); }}>Anular</Button></div>}</Td>
              </Tr>))}</tbody>
          </Table>
        </TableWrap>
      )}
      <RangeModal kind="vacaciones" employeeId={employee.id} state={form} onClose={() => setForm(null)} balance={employee.vacationBalanceDays} />
      <ConfirmDialog open={!!cancelling} title="Anular vacaciones" message={`Se anularán las vacaciones del ${formatDate(cancelling?.start)} al ${formatDate(cancelling?.end)} y se restituirá el saldo.`} confirmLabel="Anular" tone="danger" onCancel={() => setCancelling(null)} onConfirm={cancel}>{problem && <Alert tone="danger">{problem}</Alert>}</ConfirmDialog>
    </div>
  );
}

/** HU-32: registrar, modificar y anular incapacidades (comprobante opcional). */
export function DisabilitiesTab({ employee, records, canEdit }: { employee: Employee; records: DisabilityRecord[]; canEdit: boolean }) {
  const toast = useToast();
  const [form, setForm] = useState<{ record?: DisabilityRecord } | null>(null);
  const [cancelling, setCancelling] = useState<DisabilityRecord | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  async function cancel() {
    if (!cancelling) return;
    const res = await services.employees.cancelDisability(employee.id, cancelling.id);
    if (!res.ok) return setProblem(res.error.message);
    toast.success("Incapacidad anulada.");
    setCancelling(null);
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-end">{canEdit && employee.active && <Button icon="add" onClick={() => setForm({})}>Registrar incapacidad</Button>}</div>
      {records.length === 0 ? <EmptyState message="No hay incapacidades registradas." /> : (
        <TableWrap>
          <Table caption="Incapacidades"><THead><Th>Inicio</Th><Th>Fin</Th><Th>Tipo</Th><Th>Comprobante</Th><Th>Estado</Th><Th className="text-right">Acciones</Th></THead>
            <tbody>{records.map((v) => (
              <Tr key={v.id}>
                <Td className="tnum">{formatDate(v.start)}</Td><Td className="tnum">{formatDate(v.end)}</Td><Td>{DISABILITY_TYPE_LABEL[v.type]}</Td>
                <Td>{v.receipt ? `${v.receipt.name} (${formatBytes(v.receipt.size)})` : "—"}</Td>
                <Td>{v.cancelled ? <Badge tone="neutral">Anulada</Badge> : v.payrollClosed ? <Badge tone="info">Planilla cerrada</Badge> : <Badge tone="success">Registrada</Badge>}</Td>
                <Td className="text-right">{canEdit && !v.cancelled && <div className="flex justify-end gap-1"><Button variant="ghost" className="h-8 px-2" icon="edit" onClick={() => setForm({ record: v })}>Modificar</Button><Button variant="ghost" className="h-8 px-2 text-red-600" icon="event_busy" onClick={() => { setProblem(null); setCancelling(v); }}>Anular</Button></div>}</Td>
              </Tr>))}</tbody>
          </Table>
        </TableWrap>
      )}
      <RangeModal kind="incapacidad" employeeId={employee.id} state={form} onClose={() => setForm(null)} />
      <ConfirmDialog open={!!cancelling} title="Anular incapacidad" message={`Se anulará la incapacidad del ${formatDate(cancelling?.start)} al ${formatDate(cancelling?.end)}.`} confirmLabel="Anular" tone="danger" onCancel={() => setCancelling(null)} onConfirm={cancel}>{problem && <Alert tone="danger">{problem}</Alert>}</ConfirmDialog>
    </div>
  );
}

type RangeState = { record?: VacationRecord | DisabilityRecord } | null;

function RangeModal({ kind, employeeId, state, onClose, balance }: { kind: "vacaciones" | "incapacidad"; employeeId: string; state: RangeState; onClose: () => void; balance?: number }) {
  const toast = useToast();
  const [v, setV] = useState({ start: "", end: "", type: "" as DisabilityType | "" });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const current = state ? state.record?.id ?? "new" : null;
  if (current !== key) {
    setKey(current);
    if (state) {
      const r = state.record as Partial<DisabilityRecord> | undefined;
      setV({ start: r?.start ?? DEMO_TODAY, end: r?.end ?? DEMO_TODAY, type: r?.type ?? "" }); setFile(null); setErrors({}); setGeneral(null); setFileError(undefined);
    }
  }
  const editing = !!state?.record;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const local: FieldErrors = { ...validateDateRange(v), ...(kind === "incapacidad" && !v.type ? { type: "Seleccione el tipo de incapacidad." } : {}) };
    setErrors(local); setGeneral(null);
    if (Object.keys(local).length || fileError) return;
    const receipt = file ? { name: file.name, size: file.size, uploadedAt: new Date().toISOString() } : undefined;
    const res = kind === "vacaciones"
      ? editing ? await services.employees.updateVacation(employeeId, state!.record!.id, v) : await services.employees.addVacation(employeeId, v)
      : editing ? await services.employees.updateDisability(employeeId, state!.record!.id, { ...v, receipt }) : await services.employees.addDisability(employeeId, { ...v, receipt });
    if (!res.ok) { setErrors(res.error.fieldErrors ?? {}); return setGeneral(res.error.message); }
    toast.success(kind === "vacaciones" ? "Vacaciones registradas correctamente." : "Incapacidad registrada correctamente.");
    onClose();
  }

  return (
    <Modal open={!!state} onClose={onClose} size="sm" title={`${editing ? "Modificar" : "Registrar"} ${kind === "vacaciones" ? "vacaciones" : "incapacidad"}`} subtitle={balance !== undefined ? `Saldo disponible: ${balance} días` : undefined}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="range-form" icon="save">{editing ? "Guardar cambios" : "Guardar"}</Button></>}>
      <form id="range-form" onSubmit={submit} noValidate className="space-y-4">
        {general && <Alert tone="danger">{general}</Alert>}
        <FormField id="rg-start" label="Fecha de inicio" required error={errors.start}><Input id="rg-start" type="date" value={v.start} onChange={(e) => setV({ ...v, start: e.target.value })} invalid={!!errors.start} /></FormField>
        <FormField id="rg-end" label="Fecha de fin" required error={errors.end}><Input id="rg-end" type="date" value={v.end} onChange={(e) => setV({ ...v, end: e.target.value })} invalid={!!errors.end} /></FormField>
        {kind === "incapacidad" && (
          <>
            <FormField id="rg-type" label="Tipo de incapacidad" required error={errors.type}><Select id="rg-type" value={v.type} onChange={(e) => setV({ ...v, type: e.target.value as DisabilityType })} invalid={!!errors.type}><option value="">Seleccione…</option>{(Object.keys(DISABILITY_TYPE_LABEL) as DisabilityType[]).map((k) => <option key={k} value={k}>{DISABILITY_TYPE_LABEL[k]}</option>)}</Select></FormField>
            <div><p className="mb-1 text-[13px] font-medium text-slate-700">Comprobante (opcional)</p><FileInput file={file} onChange={setFile} error={fileError} onError={setFileError} /></div>
          </>
        )}
      </form>
    </Modal>
  );
}
