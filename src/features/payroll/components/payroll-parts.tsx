"use client";

import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import { formatCRC, formatDate } from "@/lib/format";
import { Badge, Button, Loading, Modal } from "@/components/ui";
import { SalaryRestricted } from "@/components/ui/feedback";
import { useSession } from "@/features/access/demo-session";
import { ITEM_KIND_LABEL, PAYROLL_STATUS_LABEL, type PayrollItemKind, type PayrollStatus } from "../types";

export const PayrollStatusBadge = ({ status }: { status: PayrollStatus }) => <Badge tone={status === "CLOSED" ? "success" : "warning"}>{PAYROLL_STATUS_LABEL[status]}</Badge>;
export const RecalcBadge = () => <Badge tone="info">Pendiente de recálculo (servidor)</Badge>;

/** Colilla de salario (alcance: "colillas de salario con el desglose y el neto"). Imprimible desde el navegador. */
export function PayslipModal({ payrollId, employeeId, onClose }: { payrollId: string | null; employeeId: string | null; onClose: () => void }) {
  const { can } = useSession();
  const q = useQuery(["payslip", payrollId, employeeId], () => (payrollId && employeeId ? services.payroll.payslip(payrollId, employeeId) : Promise.resolve(null)));
  const kinds: PayrollItemKind[] = ["EARNING", "DEDUCTION"];
  return (
    <Modal open={!!payrollId && !!employeeId} onClose={onClose} size="md" title="Colilla de salario" footer={<><Button variant="secondary" onClick={onClose}>Cerrar</Button>{can("planilla.infoSalarial") && <Button icon="print" onClick={() => window.print()}>Imprimir</Button>}</>}>
      {!can("planilla.infoSalarial") ? <SalaryRestricted /> : !q.data ? <Loading /> : (
        <div className="print-area space-y-4 text-sm">
          <div className="border-b border-slate-200 pb-3">
            <p className="text-base font-bold text-slate-900">Supermercado Los Ángeles</p>
            <p className="text-slate-600">Colilla de pago · Período {formatDate(q.data.periodStart)} – {formatDate(q.data.periodEnd)}</p>
            <p className="mt-2 font-semibold text-slate-900">{q.data.employeeName}</p>
            <p className="text-slate-600">{q.data.idNumber} · {q.data.position}</p>
          </div>
          {kinds.map((k) => (
            <div key={k}>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{ITEM_KIND_LABEL[k]}</h3>
              <ul>{q.data!.items.filter((i) => i.kind === k).map((i) => <li key={i.id} className="flex justify-between border-b border-slate-100 py-1"><span>{i.description}{i.quantity ? ` (${i.quantity})` : ""}</span><span className="tnum">{formatCRC(i.amount)}</span></li>)}</ul>
            </div>
          ))}
          <div className="flex justify-between rounded-md bg-slate-50 p-3 text-base font-bold text-slate-900"><span>Salario neto</span><span className="tnum">{formatCRC(q.data.totals.net)}</span></div>
          <p className="text-xs text-amber-700">Montos de ejemplo de la demostración. Los valores reales los calcula el servidor.</p>
        </div>
      )}
    </Modal>
  );
}
