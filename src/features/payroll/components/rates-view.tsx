"use client";

import { useState } from "react";
import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import { formatCRC, formatDate } from "@/lib/format";
import type { FieldErrors } from "@/lib/result";
import { Alert, Badge, Button, Card, DemoNotice, ErrorState, FormField, Input, Loading, Modal, PageHeader, Table, TableWrap, Td, Th, THead, Tr, useToast } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { useSession } from "@/features/access/demo-session";
import { DEMO_TODAY } from "@/services/demo/clock";
import { parseRateForm } from "../validation";
import type { GlobalRate, RateScope } from "../types";

const SCOPE_LABEL: Record<RateScope, string> = { OBRERO: "Cuota obrera y retenciones", PATRONAL: "Cargas patronales" };

/** HU-22: consultar y modificar cargas sociales y retenciones globales. Valores de ejemplo, no oficiales. */
export function RatesView() {
  const q = useQuery(["rates"], () => services.payroll.listRates());
  const { can } = useSession();
  const [editing, setEditing] = useState<GlobalRate | null>(null);

  return (
    <>
      <PageHeader title="Cargas sociales y retenciones" subtitle="Parámetros globales usados al calcular las planillas." />
      <div className="mb-4 space-y-3">
        <DemoNotice>Los porcentajes y rangos mostrados son de ejemplo y no son valores oficiales; la administración los registrará y el servidor aplicará las reglas de validación.</DemoNotice>
        <Alert tone="info" title="Restricciones de integridad">Algunos valores están fijados por ley y se muestran bloqueados con su motivo. Los cambios aplican a las planillas de los períodos posteriores a su vigencia; las planillas cerradas conservan los valores con que se generaron.</Alert>
      </div>
      {q.loading ? <Loading /> : q.error ? <ErrorState message={q.error} /> : (
        <div className="space-y-6">
          {(["OBRERO", "PATRONAL"] as RateScope[]).map((scope) => (
            <Card key={scope} title={SCOPE_LABEL[scope]} padded={false}>
              <div className="p-4"><TableWrap><Table caption={SCOPE_LABEL[scope]}>
                <THead><Th>Concepto / institución</Th><Th>Valor</Th><Th>Vigencia desde</Th><Th>Regla</Th><Th className="text-right">Acciones</Th></THead>
                <tbody>{q.data!.filter((r) => r.scope === scope).map((r) => (
                  <Tr key={r.id}>
                    <Td><span className="font-medium text-slate-900">{r.concept}</span><span className="block text-xs text-slate-500">{r.institution}</span></Td>
                    <Td className="tnum">{r.valueType === "RANGES" ? <ul className="text-xs">{r.ranges!.map((t, i) => <li key={i}>{formatCRC(t.from)} – {t.to === null ? "en adelante" : formatCRC(t.to)}: <strong>{t.percent}%</strong></li>)}</ul> : r.valueType === "PERCENT" ? `${r.value}%` : formatCRC(r.value ?? 0)}</Td>
                    <Td className="tnum">{formatDate(r.effectiveFrom)}</Td>
                    <Td>{r.locked ? <span className="inline-flex items-start gap-1 text-xs text-slate-600"><Icon name="lock" className="!text-base" />{r.lockReason}</span> : <Badge tone="success">Editable</Badge>}</Td>
                    <Td className="text-right">{can("planilla.editar") && <Button variant="ghost" className="h-8 px-2" icon={r.locked ? "block" : "edit"} disabled={r.locked} onClick={() => setEditing(r)}>{r.locked ? "Bloqueado" : "Editar"}</Button>}</Td>
                  </Tr>))}</tbody>
              </Table></TableWrap></div>
            </Card>
          ))}
        </div>
      )}
      <RateModal rate={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function RateModal({ rate, onClose }: { rate: GlobalRate | null; onClose: () => void }) {
  const toast = useToast();
  const [value, setValue] = useState("");
  const [ranges, setRanges] = useState<string[]>([]);
  const [eff, setEff] = useState(DEMO_TODAY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [key, setKey] = useState<string | null>(null);
  if ((rate?.id ?? null) !== key) {
    setKey(rate?.id ?? null);
    if (rate) { setValue(String(rate.value ?? "")); setRanges(rate.ranges?.map((t) => String(t.percent)) ?? []); setEff(DEMO_TODAY); setErrors({}); setGeneral(null); }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rate) return;
    setGeneral(null);
    if (rate.valueType === "RANGES") {
      const parsed = ranges.map((r) => parseRateForm({ value: r, effectiveFrom: eff }, true));
      const bad = parsed.find((p) => p.value === undefined);
      if (bad) return setErrors({ value: "Cada porcentaje debe ser un número entre 0 y 100." });
      const res = await services.payroll.updateRate(rate.id, { value: null, effectiveFrom: eff, rangePercents: parsed.map((p) => p.value!) });
      if (!res.ok) return setGeneral(res.error.message);
    } else {
      const p = parseRateForm({ value, effectiveFrom: eff }, rate.valueType === "PERCENT");
      setErrors(p.errors);
      if (p.value === undefined) return;
      const res = await services.payroll.updateRate(rate.id, { value: p.value, effectiveFrom: eff });
      if (!res.ok) return setGeneral(res.error.message);
    }
    toast.success("Valores actualizados.");
    onClose();
  }
  return (
    <Modal open={!!rate} onClose={onClose} size="sm" title={`Editar: ${rate?.concept ?? ""}`} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="rate-form" icon="save">Guardar</Button></>}>
      <form id="rate-form" onSubmit={submit} noValidate className="space-y-4">
        {general && <Alert tone="danger">{general}</Alert>}
        {rate?.valueType === "RANGES" ? (
          <div className="space-y-3">{rate.ranges!.map((t, i) => (
            <FormField key={i} id={`rg-${i}`} label={`Tramo ${formatCRC(t.from)} – ${t.to === null ? "en adelante" : formatCRC(t.to)} (%)`} error={i === 0 ? errors.value : undefined}><Input id={`rg-${i}`} inputMode="decimal" value={ranges[i] ?? ""} onChange={(e) => setRanges(ranges.map((x, j) => (j === i ? e.target.value : x)))} /></FormField>))}</div>
        ) : (
          <FormField id="rt-value" label={rate?.valueType === "PERCENT" ? "Porcentaje (%)" : "Valor fijo (₡)"} required error={errors.value}><Input id="rt-value" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} invalid={!!errors.value} /></FormField>
        )}
        <FormField id="rt-eff" label="Fecha de vigencia" required error={errors.effectiveFrom}><Input id="rt-eff" type="date" value={eff} onChange={(e) => setEff(e.target.value)} invalid={!!errors.effectiveFrom} /></FormField>
      </form>
    </Modal>
  );
}
