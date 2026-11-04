"use client";

import { useState } from "react";
import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import { formatCRC, formatDate } from "@/lib/format";
import type { FieldErrors } from "@/lib/result";
import { Alert, Badge, Button, Card, DemoNotice, EmptyState, ErrorState, FormField, Input, Loading, Modal, PageHeader, Select, ServerPending, Table, TableWrap, Td, Th, THead, Tr, useToast } from "@/components/ui";
import { SalaryRestricted } from "@/components/ui/feedback";
import { useSession } from "@/features/access/demo-session";
import { DEMO_TODAY } from "@/services/demo/clock";
import { ITEM_KIND_LABEL, lineTotals, PAYROLL_STATUS_LABEL } from "@/features/payroll/types";
import { fullName, SALARY_BASIS_LABEL, type SalaryBasis } from "../types";
import { parseSalaryForm } from "../validation";

/** HU-20 (consultar detalle salarial y períodos anteriores) y HU-21 (editar datos salariales). */
export function SalaryDetailView({ employeeId }: { employeeId: string }) {
  const { can } = useSession();
  const [periodId, setPeriodId] = useState<string>("");
  const rec = useQuery(["employee", employeeId], () => services.employees.getRecord(employeeId));
  const view = useQuery(["salary", employeeId, periodId], () => services.payroll.salaryView(employeeId, periodId || undefined));
  const [editing, setEditing] = useState(false);

  if (rec.loading || view.loading) return <Loading />;
  if (rec.error || view.error) return <ErrorState message={(rec.error ?? view.error)!} />;
  if (!rec.data || !view.data) return <EmptyState message="El empleado no existe." />;
  const e = rec.data.employee;
  const v = view.data;
  const selected = v.movements.find((m) => m.payrollId === (periodId || v.movements[0]?.payrollId));

  return (
    <>
      <PageHeader title={`Detalle salarial: ${fullName(e)}`} subtitle={`${e.idNumber} · ${e.position}`} backHref={`/empleados/${employeeId}`} backLabel="Volver al expediente"
        actions={can("planilla.infoSalarial") && can("planilla.editar") && <Button icon="edit" onClick={() => setEditing(true)}>Editar datos salariales</Button>} />
      <div className="mb-4"><DemoNotice /></div>
      {!can("planilla.infoSalarial") ? <SalaryRestricted /> : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="Datos salariales vigentes" className="lg:col-span-1">
              <dl className="space-y-3 text-sm">
                <R l="Tipo de salario" v={SALARY_BASIS_LABEL[e.salaryBasis]} /><R l="Salario base" v={formatCRC(e.baseSalary)} /><R l="Jornada" v={e.workday} />
                <R l="Vigente desde" v={formatDate(e.salaryEffectiveFrom)} /><R l="Saldo de vacaciones" v={`${e.vacationBalanceDays} días`} />
              </dl>
            </Card>
            <Card title={`Planilla: ${v.periodLabel}`} subtitle={selected ? PAYROLL_STATUS_LABEL[selected.status] : undefined} className="lg:col-span-2"
              actions={<Select aria-label="Período de consulta" className="w-64" value={periodId} onChange={(ev) => setPeriodId(ev.target.value)}><option value="">Período más reciente</option>{v.movements.map((m) => <option key={m.payrollId} value={m.payrollId}>{formatDate(m.periodStart)} – {formatDate(m.periodEnd)}</option>)}</Select>}>
              {!selected ? <EmptyState message="No hay movimientos de planilla registrados para este empleado." /> : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500">Se muestran los datos guardados en ese período, no los salariales actuales.</p>
                  <TableWrap><Table caption="Conceptos del período"><THead><Th>Concepto</Th><Th>Tipo</Th><Th numeric>Cantidad</Th><Th numeric>Monto</Th></THead>
                    <tbody>{selected.items.map((i) => <Tr key={i.id}><Td>{i.description}</Td><Td>{ITEM_KIND_LABEL[i.kind]}</Td><Td numeric>{i.quantity ?? "—"}</Td><Td numeric>{formatCRC(i.amount)}</Td></Tr>)}</tbody></Table></TableWrap>
                  <p className="text-sm text-slate-700">Neto del período: <strong className="tnum">{formatCRC(lineTotals(selected.items).net)}</strong> <Badge tone="warning">Ejemplo</Badge></p>
                </div>
              )}
            </Card>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Horas extra y deducciones del período"><p className="mb-2 text-sm text-slate-700">Horas extra: <strong className="tnum">{v.overtimeHours}</strong></p>
              {v.deductions.length ? <ul className="text-sm text-slate-700">{v.deductions.map((d, i) => <li key={i} className="flex justify-between border-b border-slate-100 py-1"><span>{d.description}</span><span className="tnum">{formatCRC(d.amount)}</span></li>)}</ul> : <p className="text-sm text-slate-500">Sin deducciones en el período.</p>}
            </Card>
            <Card title="Provisiones"><ServerPending>Aguinaldo y liquidación se calculan en el servidor con reglas aún por documentar.</ServerPending><dl className="mt-3 space-y-2 text-sm"><R l="Provisión de aguinaldo" v="—" /><R l="Provisión de liquidación" v="—" /></dl></Card>
          </div>
        </div>
      )}
      <SalaryModal open={editing} onClose={() => setEditing(false)} employeeId={employeeId} initial={{ salaryBasis: e.salaryBasis, baseSalary: String(e.baseSalary), workday: e.workday, effectiveFrom: DEMO_TODAY }} />
    </>
  );
}

const R = ({ l, v }: { l: string; v: string }) => <div className="flex justify-between gap-3"><dt className="text-slate-500">{l}</dt><dd className="font-medium text-slate-900">{v}</dd></div>;

function SalaryModal({ open, onClose, employeeId, initial }: { open: boolean; onClose: () => void; employeeId: string; initial: { salaryBasis: SalaryBasis; baseSalary: string; workday: string; effectiveFrom: string } }) {
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) { setWasOpen(open); if (open) { setV(initial); setErrors({}); } }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = parseSalaryForm(v);
    setErrors(p.errors);
    if (p.baseSalary === undefined) return;
    const res = await services.payroll.updateSalaryData(employeeId, { salaryBasis: v.salaryBasis, baseSalary: p.baseSalary, workday: v.workday, effectiveFrom: v.effectiveFrom });
    if (!res.ok) return setErrors(res.error.fieldErrors ?? {});
    toast.success("Datos salariales actualizados.");
    onClose();
  }
  return (
    <Modal open={open} onClose={onClose} size="sm" title="Editar datos salariales" subtitle="Las planillas cerradas conservan los montos con que se generaron."
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="sal-form" icon="save">Guardar cambios</Button></>}>
      <form id="sal-form" onSubmit={submit} noValidate className="space-y-4">
        <Alert tone="info">Los nuevos datos se usarán al generar las planillas de los períodos posteriores a su fecha de vigencia.</Alert>
        <FormField id="sl-basis" label="Tipo de salario" required error={errors.salaryBasis}><Select id="sl-basis" value={v.salaryBasis} onChange={(e) => setV({ ...v, salaryBasis: e.target.value as SalaryBasis })} invalid={!!errors.salaryBasis}>{(Object.keys(SALARY_BASIS_LABEL) as SalaryBasis[]).map((k) => <option key={k} value={k}>{SALARY_BASIS_LABEL[k]}</option>)}</Select></FormField>
        <FormField id="sl-base" label="Salario base (₡)" required error={errors.baseSalary}><Input id="sl-base" inputMode="decimal" value={v.baseSalary} onChange={(e) => setV({ ...v, baseSalary: e.target.value })} invalid={!!errors.baseSalary} /></FormField>
        <FormField id="sl-work" label="Jornada laboral" required error={errors.workday}><Input id="sl-work" value={v.workday} onChange={(e) => setV({ ...v, workday: e.target.value })} invalid={!!errors.workday} /></FormField>
        <FormField id="sl-eff" label="Fecha de vigencia" required error={errors.effectiveFrom}><Input id="sl-eff" type="date" value={v.effectiveFrom} onChange={(e) => setV({ ...v, effectiveFrom: e.target.value })} invalid={!!errors.effectiveFrom} /></FormField>
      </form>
    </Modal>
  );
}
