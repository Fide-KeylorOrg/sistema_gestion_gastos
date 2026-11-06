"use client";

import { useState } from "react";
import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import { formatDate } from "@/lib/format";
import { Alert, Badge, Button, Card, ConfirmDialog, DemoNotice, EmptyState, ErrorState, FormField, Loading, PageHeader, Select, ServerPending, Table, TableWrap, Tabs, Td, Th, THead, Tr, useToast } from "@/components/ui";
import { SalaryRestricted } from "@/components/ui/feedback";
import { useSession } from "@/features/access/demo-session";
import { NOVELTY_TYPE_LABEL, NOVELTY_UNIT } from "../types";
import { NoveltyModal, type NoveltyModalState } from "./novelty-modal";
import { PayrollStatusBadge, PayslipModal } from "./payroll-parts";

/** HU-19 (horas y permisos) y comprobantes de pago por período. */
export function NoveltiesView() {
  const payrolls = useQuery(["payrolls-all"], () => services.payroll.list({}));
  const [tab, setTab] = useState<"novedades" | "comprobantes">("novedades");
  const [payrollId, setPayrollId] = useState("");
  const selected = payrollId || payrolls.data?.find((p) => p.status === "DRAFT")?.id || payrolls.data?.[0]?.id || "";
  const period = payrolls.data?.find((p) => p.id === selected);

  return (
    <>
      <PageHeader title="Horas, permisos y comprobantes" subtitle="Novedades que afectan la planilla y colillas de pago." />
      <div className="mb-4"><DemoNotice /></div>
      <Card padded={false}>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 p-4">
          <FormField id="nvv-pay" label="Período de planilla" className="w-72">
            <Select id="nvv-pay" value={selected} onChange={(e) => setPayrollId(e.target.value)}>{payrolls.data?.map((p) => <option key={p.id} value={p.id}>{formatDate(p.periodStart)} – {formatDate(p.periodEnd)} ({p.status === "DRAFT" ? "Borrador" : "Cerrada"})</option>)}</Select>
          </FormField>
          {period && <PayrollStatusBadge status={period.status} />}
        </div>
        <div className="px-4 pt-2"><Tabs label="Secciones" value={tab} onChange={setTab} tabs={[{ id: "novedades", label: "Horas y permisos" }, { id: "comprobantes", label: "Comprobantes de pago" }]} /></div>
        <div className="p-4">
          {payrolls.loading ? <Loading /> : payrolls.error ? <ErrorState message={payrolls.error} /> : !selected ? <EmptyState message="Aún no hay planillas." /> : tab === "novedades" ? <NoveltiesTab payrollId={selected} closed={period?.status === "CLOSED"} /> : <SlipsTab payrollId={selected} />}
        </div>
      </Card>
    </>
  );
}

function NoveltiesTab({ payrollId, closed }: { payrollId: string; closed: boolean }) {
  const q = useQuery(["novelties", payrollId], () => services.payroll.listNovelties({ payrollId }));
  const { can } = useSession();
  const toast = useToast();
  const [modal, setModal] = useState<NoveltyModalState>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ServerPending>El valor asociado a cada registro y la actualización de la planilla los calcula el servidor.</ServerPending>
        {!closed && can("planilla.crear") && <Button icon="add_circle" onClick={() => setModal({ payrollId })}>Registrar horas y permisos</Button>}
      </div>
      {closed && <Alert tone="info">La planilla de este período está cerrada: sus registros no se pueden modificar.</Alert>}
      {q.loading ? <Loading /> : !q.data?.length ? <EmptyState message="No hay registros de horas o permisos para este período." /> : (
        <TableWrap><Table caption="Horas y permisos">
          <THead><Th>Fecha</Th><Th>Colaborador</Th><Th>Tipo</Th><Th numeric>Cantidad</Th><Th>Observación</Th><Th>Estado</Th><Th className="text-right">Acciones</Th></THead>
          <tbody>{q.data.map((n) => (
            <Tr key={n.id}><Td className="tnum">{formatDate(n.date)}</Td><Td className="font-medium text-slate-900">{n.employeeName}</Td><Td>{NOVELTY_TYPE_LABEL[n.type]}</Td><Td numeric>{n.quantity} {NOVELTY_UNIT[n.type]}</Td><Td>{n.note ?? "—"}</Td><Td>{n.cancelled ? <Badge tone="neutral">Anulado</Badge> : <Badge tone="success">Registrado</Badge>}</Td>
              <Td className="text-right">{!closed && !n.cancelled && can("planilla.editar") && <div className="flex justify-end gap-1"><Button variant="ghost" className="h-8 px-2" icon="edit" onClick={() => setModal({ record: n })}>Modificar</Button><Button variant="ghost" className="h-8 px-2 text-red-600" icon="block" onClick={() => { setProblem(null); setCancelId(n.id); }}>Anular</Button></div>}</Td></Tr>))}</tbody>
        </Table></TableWrap>
      )}
      <NoveltyModal state={modal} onClose={() => setModal(null)} />
      <ConfirmDialog open={!!cancelId} title="Anular registro" message="Se anulará el registro y la planilla quedará pendiente de recálculo." confirmLabel="Anular" tone="danger" onCancel={() => setCancelId(null)}
        onConfirm={async () => { if (!cancelId) return; const r = await services.payroll.cancelNovelty(cancelId); if (!r.ok) return setProblem(r.error.message); toast.success("Registro anulado."); setCancelId(null); }}>{problem && <Alert tone="danger">{problem}</Alert>}</ConfirmDialog>
    </div>
  );
}

function SlipsTab({ payrollId }: { payrollId: string }) {
  const q = useQuery(["payroll", payrollId], () => services.payroll.get(payrollId));
  const { can } = useSession();
  const toast = useToast();
  const [slip, setSlip] = useState<string | null>(null);
  if (!can("planilla.infoSalarial")) return <SalaryRestricted />;
  if (q.loading) return <Loading />;
  if (!q.data) return <EmptyState message="La planilla no existe." />;
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button variant="secondary" icon="folder_zip" onClick={() => toast.info("La generación masiva de comprobantes la realizará el servidor.")}>Generar todos los comprobantes</Button></div>
      <TableWrap><Table caption="Comprobantes">
        <THead><Th>Colaborador</Th><Th>Cédula</Th><Th>Puesto</Th><Th className="text-right">Acciones</Th></THead>
        <tbody>{q.data.lines.map((l) => <Tr key={l.employeeId}><Td className="font-medium text-slate-900">{l.employeeName}</Td><Td className="tnum">{l.idNumber}</Td><Td>{l.position}</Td><Td className="text-right"><Button variant="ghost" className="h-8" icon="visibility" onClick={() => setSlip(l.employeeId)}>Ver comprobante</Button></Td></Tr>)}</tbody>
      </Table></TableWrap>
      <PayslipModal payrollId={slip ? payrollId : null} employeeId={slip} onClose={() => setSlip(null)} />
    </div>
  );
}
