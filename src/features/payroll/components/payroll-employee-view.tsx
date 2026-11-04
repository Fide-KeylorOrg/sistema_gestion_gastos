"use client";

import { useState } from "react";
import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import { formatCRC, formatDate } from "@/lib/format";
import type { FieldErrors } from "@/lib/result";
import { Alert, Badge, Button, Card, ConfirmDialog, DemoNotice, EmptyState, ErrorState, FormField, Input, Loading, PageHeader, ServerPending, Table, TableWrap, Td, Textarea, Th, THead, Tr, useToast } from "@/components/ui";
import { SalaryRestricted } from "@/components/ui/feedback";
import { useSession } from "@/features/access/demo-session";
import { ITEM_KIND_LABEL, lineTotals, NOVELTY_TYPE_LABEL, NOVELTY_UNIT, type PayrollItemKind } from "../types";
import { parseLineEdit } from "../validation";
import { NoveltyModal, type NoveltyModalState } from "./novelty-modal";
import { PayrollStatusBadge, PayslipModal, RecalcBadge } from "./payroll-parts";

/** HU-17 esc. 2 (desglose individual), HU-18 (editar y recalcular borrador) y HU-19 (horas y permisos del empleado). */
export function PayrollEmployeeView({ payrollId, employeeId }: { payrollId: string; employeeId: string }) {
  const q = useQuery(["payroll", payrollId], () => services.payroll.get(payrollId));
  const novelties = useQuery(["novelties", payrollId, employeeId], () => services.payroll.listNovelties({ payrollId, employeeId }));
  const { can } = useSession();
  const [novelty, setNovelty] = useState<NoveltyModalState>(null);
  const [slip, setSlip] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const toast = useToast();

  if (q.loading) return <Loading />;
  if (q.error) return <ErrorState message={q.error} />;
  const line = q.data?.lines.find((l) => l.employeeId === employeeId);
  if (!q.data || !line) return <><PageHeader title="Registro no encontrado" backHref={`/planilla/${payrollId}`} backLabel="Volver a la planilla" /><EmptyState message="El colaborador no forma parte de esta planilla." /></>;
  const { payroll } = q.data;
  const closed = payroll.status === "CLOSED";
  const t = lineTotals(line.items);
  const kinds: PayrollItemKind[] = ["EARNING", "DEDUCTION", "EMPLOYER_CONTRIBUTION"];

  return (
    <>
      <PageHeader title={line.employeeName} subtitle={<span className="inline-flex flex-wrap items-center gap-2">{line.idNumber} · {line.position} · Planilla {formatDate(payroll.periodStart)} – {formatDate(payroll.periodEnd)} <PayrollStatusBadge status={payroll.status} />{line.recalcPending && <RecalcBadge />}</span>}
        backHref={`/planilla/${payrollId}`} backLabel="Volver a la planilla"
        actions={<>{can("planilla.infoSalarial") && <Button variant="secondary" icon="receipt_long" onClick={() => setSlip(true)}>Ver colilla</Button>}{!closed && can("planilla.crear") && <Button icon="add_circle" onClick={() => setNovelty({ payrollId, employeeId })}>Registrar horas y permisos</Button>}</>} />
      <div className="mb-4 space-y-3"><DemoNotice /><ServerPending>Los montos son de ejemplo. Al guardar cambios se registran las novedades y la línea queda pendiente de recálculo por el servidor.</ServerPending></div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Desglose detallado de planilla">
            {!can("planilla.infoSalarial") ? <SalaryRestricted /> : (
              <div className="space-y-5">
                {kinds.map((k) => { const items = line.items.filter((i) => i.kind === k); return (
                  <div key={k}><h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{ITEM_KIND_LABEL[k]}</h3>
                    {items.length === 0 ? <p className="text-sm text-slate-500">Sin conceptos.</p> : <TableWrap><Table><tbody>{items.map((i) => <Tr key={i.id}><Td>{i.description}</Td><Td numeric>{i.quantity ?? ""}</Td><Td numeric>{formatCRC(i.amount)}</Td></Tr>)}</tbody></Table></TableWrap>}
                  </div>); })}
                <dl className="grid gap-3 sm:grid-cols-3 text-sm">
                  <div className="rounded-md bg-slate-50 p-3"><dt className="text-slate-500">Salario bruto</dt><dd className="tnum font-semibold text-slate-900">{formatCRC(t.gross)}</dd></div>
                  <div className="rounded-md bg-slate-50 p-3"><dt className="text-slate-500">Deducciones</dt><dd className="tnum font-semibold text-slate-900">{formatCRC(t.deductions)}</dd></div>
                  <div className="rounded-md bg-blue-50 p-3"><dt className="text-blue-800">Salario neto</dt><dd className="tnum font-bold text-blue-800">{formatCRC(t.net)}</dd></div>
                </dl>
              </div>)}
          </Card>

          <Card title="Horas y permisos registrados" subtitle="Novedades de este colaborador en el período">
            {novelties.loading ? <Loading /> : !novelties.data?.length ? <EmptyState message="No hay registros de horas o permisos en este período." /> : (
              <TableWrap><Table caption="Novedades"><THead><Th>Fecha</Th><Th>Tipo</Th><Th numeric>Cantidad</Th><Th>Observación</Th><Th>Estado</Th><Th className="text-right">Acciones</Th></THead>
                <tbody>{novelties.data.map((n) => (
                  <Tr key={n.id}><Td className="tnum">{formatDate(n.date)}</Td><Td>{NOVELTY_TYPE_LABEL[n.type]}</Td><Td numeric>{n.quantity} {NOVELTY_UNIT[n.type]}</Td><Td>{n.note ?? "—"}</Td><Td>{n.cancelled ? <Badge tone="neutral">Anulado</Badge> : <Badge tone="success">Registrado</Badge>}</Td>
                    <Td className="text-right">{!closed && !n.cancelled && can("planilla.editar") && <div className="flex justify-end gap-1"><Button variant="ghost" className="h-8 px-2" icon="edit" onClick={() => setNovelty({ record: n })}>Modificar</Button><Button variant="ghost" className="h-8 px-2 text-red-600" icon="block" onClick={() => setCancelId(n.id)}>Anular</Button></div>}</Td></Tr>))}</tbody></Table></TableWrap>
            )}
          </Card>
        </div>

        <EditLineCard payrollId={payrollId} employeeId={employeeId} closed={closed} canEdit={can("planilla.editar")} line={line} />
      </div>

      <NoveltyModal state={novelty} onClose={() => setNovelty(null)} />
      <PayslipModal payrollId={slip ? payrollId : null} employeeId={slip ? employeeId : null} onClose={() => setSlip(false)} />
      <ConfirmDialog open={!!cancelId} title="Anular registro" message="Se anulará el registro y la línea quedará pendiente de recálculo." confirmLabel="Anular" tone="danger" onCancel={() => setCancelId(null)}
        onConfirm={async () => { if (cancelId) { const r = await services.payroll.cancelNovelty(cancelId); if (r.ok) toast.success("Registro anulado."); else toast.error(r.error.message); setCancelId(null); } }} />
    </>
  );
}

function EditLineCard({ payrollId, employeeId, closed, canEdit, line }: { payrollId: string; employeeId: string; closed: boolean; canEdit: boolean; line: { items: { code: string; quantity?: number; amount: number }[] } }) {
  const toast = useToast();
  const initial = { overtime: String(line.items.find((i) => i.code === "OVERTIME")?.quantity ?? 0), extraDeduction: String(line.items.find((i) => i.code === "EXTRA_DEDUCTION")?.amount ?? 0), reason: "" };
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [general, setGeneral] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = parseLineEdit(v);
    setErrors(p.errors); setGeneral(null);
    if (p.overtime === undefined) return;
    const res = await services.payroll.editLine(payrollId, employeeId, { overtimeHours: p.overtime, extraDeduction: p.extraDeduction!, reason: v.reason });
    if (!res.ok) { setErrors(res.error.fieldErrors ?? {}); return setGeneral(res.error.message); }
    toast.success("Planilla actualizada. Los montos serán recalculados por el servidor.");
    setV({ ...v, reason: "" });
  }

  return (
    <Card title="Edición de la planilla" subtitle="Solo mientras está en borrador">
      {closed ? <Alert tone="warning" title="Planilla cerrada">La planilla está cerrada y no se puede modificar.</Alert> : !canEdit ? <Alert tone="warning">No tiene permiso para editar la planilla.</Alert> : (
        <form onSubmit={submit} noValidate className="space-y-4">
          {general && <Alert tone="danger">{general}</Alert>}
          <FormField id="le-ot" label="Horas extra registradas" error={errors.overtime}><Input id="le-ot" inputMode="decimal" value={v.overtime} onChange={(e) => setV({ ...v, overtime: e.target.value })} invalid={!!errors.overtime} /></FormField>
          <FormField id="le-ded" label="Deducciones adicionales (₡)" error={errors.extraDeduction}><Input id="le-ded" inputMode="decimal" value={v.extraDeduction} onChange={(e) => setV({ ...v, extraDeduction: e.target.value })} invalid={!!errors.extraDeduction} /></FormField>
          <FormField id="le-reason" label="Motivo del ajuste" required error={errors.reason}><Textarea id="le-reason" value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })} invalid={!!errors.reason} /></FormField>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => { setV(initial); setErrors({}); setGeneral(null); }}>Cancelar</Button><Button type="submit" icon="save">Guardar cambios</Button></div>
        </form>
      )}
    </Card>
  );
}
