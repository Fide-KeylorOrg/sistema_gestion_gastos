"use client";

import { useState } from "react";
import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import type { FieldErrors } from "@/lib/result";
import { Alert, Button, FormField, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { DEMO_TODAY } from "@/services/demo/clock";
import { NOVELTY_MAX, NOVELTY_TYPE_LABEL, NOVELTY_UNIT, type Novelty, type NoveltyType } from "../types";
import { parseNoveltyForm } from "../validation";

export type NoveltyModalState = { record?: Novelty; payrollId?: string; employeeId?: string } | null;

/** HU-19: registrar y modificar horas extra, feriados trabajados y permisos. El valor asociado lo calcula el servidor. */
export function NoveltyModal({ state, onClose }: { state: NoveltyModalState; onClose: () => void }) {
  const toast = useToast();
  const payrolls = useQuery(["payrolls-all"], () => services.payroll.list({}));
  const [v, setV] = useState({ payrollId: "", employeeId: "", date: DEMO_TODAY, type: "" as NoveltyType | "", quantity: "", note: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const detail = useQuery(["payroll", v.payrollId], () => (v.payrollId ? services.payroll.get(v.payrollId) : Promise.resolve(null)));

  const current = state ? state.record?.id ?? `new-${state.payrollId}-${state.employeeId}` : null;
  if (current !== key) {
    setKey(current);
    if (state) {
      const r = state.record;
      const draft = payrolls.data?.find((p) => p.status === "DRAFT");
      setV({ payrollId: r?.payrollId ?? state.payrollId ?? draft?.id ?? "", employeeId: r?.employeeId ?? state.employeeId ?? "", date: r?.date ?? DEMO_TODAY, type: r?.type ?? "", quantity: r ? String(r.quantity) : "", note: r?.note ?? "" });
      setErrors({}); setGeneral(null);
    }
  }
  const editing = !!state?.record;
  const drafts = (payrolls.data ?? []).filter((p) => p.status === "DRAFT");
  const period = detail.data ? { start: detail.data.payroll.periodStart, end: detail.data.payroll.periodEnd } : undefined;
  const unit = v.type ? NOVELTY_UNIT[v.type] : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseNoveltyForm(v, period);
    setErrors(parsed.errors); setGeneral(null);
    if (!parsed.input) return;
    const res = await services.payroll.saveNovelty(parsed.input, state?.record?.id);
    if (!res.ok) { setErrors(res.error.fieldErrors ?? {}); return setGeneral(res.error.message); }
    toast.success(editing ? "Registro modificado; la planilla quedó pendiente de recálculo." : "Registro guardado; la planilla quedó pendiente de recálculo.");
    onClose();
  }

  return (
    <Modal open={!!state} onClose={onClose} size="sm" title={editing ? "Modificar registro" : "Registrar horas y permisos"} subtitle="Solo en planillas en borrador."
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="nov-form" icon="save">{editing ? "Guardar cambios" : "Guardar registro"}</Button></>}>
      <form id="nov-form" onSubmit={submit} noValidate className="space-y-4">
        {general && <Alert tone="danger">{general}</Alert>}
        <FormField id="nv-pay" label="Período" required error={errors.payrollId}>
          <Select id="nv-pay" value={v.payrollId} disabled={editing} onChange={(e) => setV({ ...v, payrollId: e.target.value, employeeId: "" })} invalid={!!errors.payrollId}>
            <option value="">Seleccione…</option>{drafts.map((p) => <option key={p.id} value={p.id}>{p.periodStart.split("-").reverse().join("/")} – {p.periodEnd.split("-").reverse().join("/")}</option>)}
            {editing && payrolls.data?.filter((p) => p.id === v.payrollId && p.status !== "DRAFT").map((p) => <option key={p.id} value={p.id}>{p.periodStart} – {p.periodEnd}</option>)}
          </Select>
        </FormField>
        <FormField id="nv-emp" label="Colaborador" required error={errors.employeeId}>
          <Select id="nv-emp" value={v.employeeId} disabled={editing} onChange={(e) => setV({ ...v, employeeId: e.target.value })} invalid={!!errors.employeeId}>
            <option value="">Seleccione…</option>{detail.data?.lines.map((l) => <option key={l.employeeId} value={l.employeeId}>{l.employeeName}</option>)}
          </Select>
        </FormField>
        <FormField id="nv-type" label="Tipo de registro" required error={errors.type}>
          <Select id="nv-type" value={v.type} onChange={(e) => setV({ ...v, type: e.target.value as NoveltyType })} invalid={!!errors.type}><option value="">Seleccione…</option>{(Object.keys(NOVELTY_TYPE_LABEL) as NoveltyType[]).map((k) => <option key={k} value={k}>{NOVELTY_TYPE_LABEL[k]}</option>)}</Select>
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="nv-date" label="Fecha" required error={errors.date} hint={period ? `Dentro de ${period.start.split("-").reverse().join("/")} – ${period.end.split("-").reverse().join("/")}` : undefined}><Input id="nv-date" type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} invalid={!!errors.date} /></FormField>
          <FormField id="nv-qty" label={`Cantidad${unit ? ` (${unit})` : ""}`} required error={errors.quantity} hint={unit ? `Máximo ${NOVELTY_MAX[unit]} ${unit} por registro` : undefined}><Input id="nv-qty" inputMode="decimal" value={v.quantity} onChange={(e) => setV({ ...v, quantity: e.target.value })} invalid={!!errors.quantity} /></FormField>
        </div>
        <FormField id="nv-note" label="Observación (opcional)"><Textarea id="nv-note" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} /></FormField>
      </form>
    </Modal>
  );
}
