"use client";

import { useState } from "react";
import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import { formatCRC, formatDate } from "@/lib/format";
import type { FieldErrors } from "@/lib/result";
import { Alert, Button, Card, DemoNotice, EmptyState, FormField, Input, Loading, PageHeader, Select, ServerPending, Table, TableWrap, Td, Th, THead, Tr } from "@/components/ui";
import { SalaryRestricted } from "@/components/ui/feedback";
import { useSession } from "@/features/access/demo-session";
import { fullName } from "@/features/employees/types";
import { EXIT_REASON_LABEL, type ExitReason, type LiquidationResult } from "../types";
import { validateLiquidation } from "../validation";

/** HU-23: calcular la liquidación de un empleado. El cálculo real es del servidor: aquí solo un ejemplo ilustrativo. */
export function LiquidationView() {
  const { can } = useSession();
  const employees = useQuery(["employees-all"], () => services.employees.list({}));
  const [v, setV] = useState({ employeeId: "", exitDate: "", exitReason: "" as ExitReason | "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<LiquidationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const emp = employees.data?.find((e) => e.id === v.employeeId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    const local = validateLiquidation(v, emp?.hireDate);
    setErrors(local);
    if (Object.keys(local).length) return;
    setBusy(true);
    const res = await services.payroll.calculateLiquidation({ employeeId: v.employeeId, exitDate: v.exitDate, exitReason: v.exitReason });
    setBusy(false);
    if (!res.ok) return setErrors(res.error.fieldErrors ?? { employeeId: res.error.message });
    setResult(res.data);
  }
  const reset = () => { setV({ employeeId: "", exitDate: "", exitReason: "" }); setErrors({}); setResult(null); };

  if (!can("planilla.infoSalarial")) return <><PageHeader title="Cálculo de liquidación laboral" /><SalaryRestricted /></>;
  return (
    <>
      <PageHeader title="Cálculo de liquidación laboral" subtitle="Desglose y total correspondiente a la salida de un empleado." />
      <div className="mb-4 space-y-3"><DemoNotice /><ServerPending>Las reglas de liquidación aún no están documentadas ni configuradas. El resultado que se muestra es un ejemplo ilustrativo con cifras fijas, no un cálculo real.</ServerPending></div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Datos del expediente" className="lg:col-span-1 self-start">
          {employees.loading ? <Loading /> : (
            <form onSubmit={submit} noValidate className="space-y-4">
              <FormField id="lq-emp" label="Empleado" required error={errors.employeeId}><Select id="lq-emp" value={v.employeeId} onChange={(e) => { setV({ ...v, employeeId: e.target.value }); setResult(null); }} invalid={!!errors.employeeId}><option value="">Seleccione…</option>{employees.data?.map((x) => <option key={x.id} value={x.id}>{fullName(x)}{x.active ? "" : " (inactivo)"}</option>)}</Select></FormField>
              <FormField id="lq-hire" label="Fecha de ingreso"><Input id="lq-hire" value={emp ? formatDate(emp.hireDate) : ""} readOnly disabled placeholder="Según el expediente" /></FormField>
              <FormField id="lq-exit" label="Fecha de salida" required error={errors.exitDate}><Input id="lq-exit" type="date" value={v.exitDate} onChange={(e) => setV({ ...v, exitDate: e.target.value })} invalid={!!errors.exitDate} /></FormField>
              <FormField id="lq-reason" label="Motivo de salida" required error={errors.exitReason}><Select id="lq-reason" value={v.exitReason} onChange={(e) => setV({ ...v, exitReason: e.target.value as ExitReason })} invalid={!!errors.exitReason}><option value="">Seleccione…</option>{(Object.keys(EXIT_REASON_LABEL) as ExitReason[]).map((k) => <option key={k} value={k}>{EXIT_REASON_LABEL[k]}</option>)}</Select></FormField>
              <div className="flex gap-2"><Button type="submit" icon="calculate" disabled={busy}>Calcular liquidación</Button><Button variant="secondary" icon="restart_alt" onClick={reset}>Limpiar</Button></div>
            </form>
          )}
        </Card>
        <div className="lg:col-span-2">
          {!result ? <Card title="Conceptos laborales aplicables"><EmptyState message="Complete los datos y presione «Calcular liquidación»." /></Card>
            : result.status === "MISSING_DATA" ? (
              <Alert tone="warning" title="No se puede mostrar un total definitivo">Faltan datos o reglas necesarias:<ul className="mt-1 list-inside list-disc">{result.missing.map((m, i) => <li key={i}>{m}</li>)}</ul></Alert>
            ) : (
              <Card title="Conceptos laborales aplicables" subtitle="Ejemplo ilustrativo" actions={<Button variant="secondary" icon="print" onClick={() => window.print()}>Imprimir desglose</Button>}>
                <div className="print-area space-y-4">
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">{result.usedData.map((d) => <div key={d.label} className="flex justify-between rounded bg-slate-50 px-3 py-2"><dt className="text-slate-500">{d.label}</dt><dd className="font-medium text-slate-900">{d.value}</dd></div>)}</dl>
                  <TableWrap><Table caption="Conceptos de liquidación"><THead><Th>Concepto</Th><Th>Base de cálculo</Th><Th numeric>Días</Th><Th numeric>Monto</Th></THead>
                    <tbody>{result.concepts.map((c) => <Tr key={c.concept}><Td>{c.concept}</Td><Td>{c.basis}</Td><Td numeric>{c.days ?? "—"}</Td><Td numeric>{formatCRC(c.amount)}</Td></Tr>)}</tbody></Table></TableWrap>
                  <div className="flex justify-between rounded-md bg-blue-50 p-3 text-base font-bold text-blue-800"><span>Total (ejemplo)</span><span className="tnum">{formatCRC(result.total)}</span></div>
                </div>
              </Card>
            )}
        </div>
      </div>
    </>
  );
}
