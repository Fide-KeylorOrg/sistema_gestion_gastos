"use client";

import Link from "next/link";
import { useState } from "react";
import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import { formatDate } from "@/lib/format";
import type { CcssCheck } from "../types";
import { Alert, Button, Card, ConfirmDialog, DemoNotice, EmptyState, ErrorState, Loading, Modal, PageHeader, ServerPending, Table, TableWrap, Td, Th, THead, Tr, useToast } from "@/components/ui";
import { useSession } from "@/features/access/demo-session";
import { SalaryAmount } from "@/features/access/salary-amount";
import { lineTotals } from "../types";
import { PayrollStatusBadge, PayslipModal, RecalcBadge } from "./payroll-parts";

export function PayrollDetailView({ payrollId }: { payrollId: string }) {
  const q = useQuery(["payroll", payrollId], () => services.payroll.get(payrollId));
  const { can } = useSession();
  const toast = useToast();
  const [closing, setClosing] = useState(false);
  const [ccss, setCcss] = useState<CcssCheck | null>(null);
  const [slips, setSlips] = useState(false);
  const [slip, setSlip] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  if (q.loading) return <Loading />;
  if (q.error) return <ErrorState message={q.error} />;
  if (!q.data) return <><PageHeader title="Planilla no encontrada" backHref="/planilla" backLabel="Volver a planillas" /><EmptyState message="No hay una planilla registrada para este período." /></>;
  const { payroll, lines, totals, employerItems, recalcPending } = q.data;
  const closed = payroll.status === "CLOSED";

  async function close() {
    const res = await services.payroll.close(payrollId);
    if (!res.ok) return setProblem(res.error.message);
    toast.success("Planilla cerrada. Ya no se puede editar.");
    setClosing(false);
  }

  return (
    <>
      <PageHeader title={`Planilla quincenal: ${formatDate(payroll.periodStart)} al ${formatDate(payroll.periodEnd)}`}
        subtitle={<span className="inline-flex items-center gap-2"><PayrollStatusBadge status={payroll.status} />{closed && payroll.closedAt && <span>Cerrada el {formatDate(payroll.closedAt)}</span>}{recalcPending && <RecalcBadge />}</span>}
        backHref="/planilla" backLabel="Volver a planillas"
        actions={<>
          {!closed && can("planilla.editar") && <Button variant="secondary" icon="lock" onClick={() => { setProblem(null); setClosing(true); }}>Cerrar planilla</Button>}
          <Button variant="secondary" icon="receipt" onClick={async () => setCcss(await services.payroll.checkCcss(payrollId))}>Generar archivo CCSS</Button>
          <Button icon="receipt_long" onClick={() => setSlips(true)}>Generar comprobantes</Button>
        </>} />
      <div className="mb-4 space-y-3">
        <DemoNotice />
        <ServerPending>Ingresos, deducciones, neto y cargas patronales son valores de ejemplo; los calcula el servidor. Las ediciones se guardan como novedades y quedan «pendientes de recálculo».</ServerPending>
        {closed && <Alert tone="info">La planilla está cerrada: sus datos no se pueden modificar.</Alert>}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Total l="Salario bruto" v={totals.gross} /><Total l="Deducciones" v={totals.deductions} /><Total l="Salario neto" v={totals.net} strong /><Total l="Cargas patronales (aparte)" v={totals.employer} />
      </div>

      <div className="mt-6 space-y-6">
        <Card title="Detalle de colaboradores" padded={false}>
          <div className="p-4">
            {lines.length === 0 ? <EmptyState message="Esta planilla no tiene colaboradores." /> : (
              <TableWrap><Table caption="Colaboradores de la planilla">
                <THead><Th>Cédula</Th><Th>Nombre completo</Th><Th>Puesto</Th><Th numeric>Salario bruto</Th><Th numeric>Deducciones</Th><Th numeric>Salario neto</Th><Th className="text-right">Acciones</Th></THead>
                <tbody>{lines.map((l) => { const t = lineTotals(l.items); return (
                  <Tr key={l.employeeId}>
                    <Td className="tnum">{l.idNumber}</Td><Td className="font-medium text-slate-900">{l.employeeName}{l.recalcPending && <span className="ml-2"><RecalcBadge /></span>}</Td><Td>{l.position}</Td>
                    <Td numeric><SalaryAmount value={t.gross} /></Td><Td numeric><SalaryAmount value={t.deductions} /></Td><Td numeric><SalaryAmount value={t.net} /></Td>
                    <Td className="text-right"><Link href={`/planilla/${payrollId}/empleados/${l.employeeId}`} className="font-medium text-blue-700 hover:underline">{closed ? "Ver desglose" : "Ver desglose y editar"}</Link></Td>
                  </Tr>); })}</tbody>
              </Table></TableWrap>
            )}
          </div>
        </Card>
        <Card title="Cargas patronales del período" subtitle="Se presentan por separado y no se descuentan del empleado.">
          {employerItems.length === 0 ? <p className="text-sm text-slate-500">Sin cargas patronales.</p> : (
            <ul className="text-sm">{employerItems.map((i) => <li key={i.code} className="flex justify-between border-b border-slate-100 py-2"><span>{i.description}</span><span className="tnum"><SalaryAmount value={i.amount} /></span></li>)}</ul>
          )}
        </Card>
      </div>

      <ConfirmDialog open={closing} title="Cerrar planilla" message="Al cerrarla, la planilla no podrá editarse ni recalcularse, y los adelantos pendientes del período pasarán a descontados." confirmLabel="Cerrar planilla" busy={false} onCancel={() => setClosing(false)} onConfirm={close}>{problem && <Alert tone="danger">{problem}</Alert>}</ConfirmDialog>

      <Modal open={ccss !== null} onClose={() => setCcss(null)} size="sm" title="Archivo de planilla CCSS" footer={<Button variant="secondary" onClick={() => setCcss(null)}>Cerrar</Button>}>
        {ccss?.ok ? <Alert tone="info" title="Listo para generar">El archivo con el formato de la CCSS lo generará y descargará el servidor. No está disponible en la demostración.</Alert>
          : ccss?.reason === "NOT_CLOSED" ? <Alert tone="warning" title="Planilla en borrador">Debe cerrar la planilla antes de generar el archivo CCSS.</Alert>
          : ccss ? (<div className="space-y-2 text-sm"><Alert tone="danger" title="Faltan datos para la CCSS">No se generó el archivo. Complete los siguientes datos:</Alert>
              <ul className="list-inside list-disc text-slate-700">{ccss.missing?.map((m, i) => <li key={i}>{m.employee}: {m.field}</li>)}</ul></div>) : null}
      </Modal>

      <Modal open={slips} onClose={() => setSlips(false)} size="md" title="Comprobantes de pago" subtitle="Colillas del período" footer={<Button variant="secondary" onClick={() => setSlips(false)}>Cerrar</Button>}>
        {!can("planilla.infoSalarial") ? <Alert tone="warning" title="Información salarial restringida">No tiene permiso para consultar comprobantes.</Alert> : (
          <ul className="divide-y divide-slate-100">{lines.map((l) => <li key={l.employeeId} className="flex items-center justify-between py-2 text-sm"><span>{l.employeeName}</span><Button variant="ghost" className="h-8" icon="visibility" onClick={() => setSlip(l.employeeId)}>Ver colilla</Button></li>)}</ul>
        )}
      </Modal>
      <PayslipModal payrollId={slip ? payrollId : null} employeeId={slip} onClose={() => setSlip(null)} />
    </>
  );
}

const Total = ({ l, v, strong }: { l: string; v: number; strong?: boolean }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_0_rgba(15,23,42,0.05)]">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{l}</p>
    <p className={`tnum mt-1 text-xl ${strong ? "font-bold text-blue-700" : "font-semibold text-slate-900"}`}><SalaryAmount value={v} /></p>
  </div>
);
