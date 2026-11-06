"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import type { FieldErrors } from "@/lib/result";
import { Alert, Button, Card, Checkbox, DemoNotice, ErrorState, FileInput, FormField, Input, Loading, PageHeader, Select, Textarea, useToast } from "@/components/ui";
import { EXPENSE_KIND_LABEL, RECURRENCE_LABEL, type Attachment, type ExpenseKind, type Recurrence } from "../types";
import { parseExpenseForm, type ExpenseFormValues } from "../validation";

const BLANK: ExpenseFormValues = { concept: "", categoryId: "", kind: "PAYMENT", amount: "", dueDate: "", referenceNumber: "", notes: "", recurring: false, recurrence: "", recurrenceEndsOn: "", notify: true, notifyDays: "7", recipients: "" };

/** Registrar (HU-37, 40, 41, 42, 47, 51) y editar (HU-39, 50). Con `expenseId` es edición. */
export function ExpenseFormView({ expenseId }: { expenseId?: string }) {
  const editing = !!expenseId;
  const existing = useQuery(["expense-edit", expenseId], () => (expenseId ? services.expenses.getExpense(expenseId) : Promise.resolve(null)));
  const categories = useQuery(["categories"], () => services.expenses.listCategories());
  const settings = useQuery(["notif-settings"], () => services.expenses.getNotificationSettings());

  if (categories.loading || (editing && existing.loading)) return <Loading />;
  if (categories.error || existing.error) return <ErrorState message={(categories.error ?? existing.error)!} />;
  if (editing && !existing.data) return <Alert tone="danger" title="El gasto no existe" />;

  const e = existing.data?.expense;
  const initial: ExpenseFormValues = e
    ? { concept: e.concept, categoryId: e.categoryId, kind: e.kind, amount: String(e.estimatedAmount), dueDate: e.dueDate, referenceNumber: e.referenceNumber ?? "", notes: e.notes ?? "", recurring: e.recurrence !== "NONE", recurrence: e.recurrence === "NONE" ? "" : e.recurrence, recurrenceEndsOn: e.recurrenceEndsOn ?? "", notify: e.notifyDaysBefore !== null, notifyDays: String(e.notifyDaysBefore ?? "7"), recipients: e.extraRecipients.join(", ") }
    : BLANK;
  const backHref = editing && existing.data ? `/gastos/${existing.data.dueId}` : "/gastos";

  return (
    <Form key={expenseId ?? "new"} initial={initial} initialAttachment={e?.attachment} expenseId={expenseId} backHref={backHref}
      categories={(categories.data ?? []).filter((c) => c.active || c.id === e?.categoryId)} globalRecipients={settings.data?.globalRecipients ?? []} />
  );
}

function Form({ initial, initialAttachment, expenseId, backHref, categories, globalRecipients }: {
  initial: ExpenseFormValues; initialAttachment?: Attachment; expenseId?: string; backHref: string;
  categories: { id: string; name: string }[]; globalRecipients: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof ExpenseFormValues) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: ev.target.value });

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setGeneral(null);
    const parsed = parseExpenseForm(v);
    setErrors(parsed.errors);
    if (!parsed.input || fileError) return;
    const attachment: Attachment | undefined = file ? { name: file.name, size: file.size, uploadedAt: new Date().toISOString() } : initialAttachment;
    const input = { ...parsed.input, attachment };
    setBusy(true);
    const res = expenseId ? await services.expenses.update(expenseId, input) : await services.expenses.create(input);
    setBusy(false);
    if (!res.ok) { setErrors(res.error.fieldErrors ?? {}); return setGeneral(res.error.message); }
    toast.success(expenseId ? "Gasto actualizado correctamente." : "Gasto registrado correctamente en estado pendiente.");
    router.push(`/gastos/${res.data.dueId}`);
  }

  return (
    <>
      <PageHeader title={expenseId ? "Editar gasto" : "Registrar gasto"} subtitle="Los campos marcados con * son obligatorios." backHref={backHref} backLabel="Volver" />
      <div className="mb-4"><DemoNotice /></div>
      <form onSubmit={submit} noValidate className="max-w-4xl space-y-6">
        {general && <Alert tone="danger">{general}</Alert>}
        <Card title="Información del gasto">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="x-concept" label="Concepto del gasto" required error={errors.concept} className="sm:col-span-2"><Input id="x-concept" value={v.concept} onChange={set("concept")} invalid={!!errors.concept} /></FormField>
            <FormField id="x-cat" label="Categoría" required error={errors.categoryId} hint={<>¿No existe? <Link className="text-blue-700 hover:underline" href="/gastos/categorias">Crear categoría</Link></>}>
              <Select id="x-cat" value={v.categoryId} onChange={set("categoryId")} invalid={!!errors.categoryId}><option value="">Seleccione…</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            </FormField>
            <FormField id="x-kind" label="Tipo" hint="Los permisos sanitarios y comerciales usan el vencimiento como fecha de expiración.">
              <Select id="x-kind" value={v.kind} onChange={(ev) => setV({ ...v, kind: ev.target.value as ExpenseKind })}>{(Object.keys(EXPENSE_KIND_LABEL) as ExpenseKind[]).map((k) => <option key={k} value={k}>{EXPENSE_KIND_LABEL[k]}</option>)}</Select>
            </FormField>
            <FormField id="x-amount" label="Monto estimado (₡)" required error={errors.amount}><Input id="x-amount" inputMode="decimal" value={v.amount} onChange={set("amount")} invalid={!!errors.amount} placeholder="0,00" /></FormField>
            <FormField id="x-due" label="Fecha de vencimiento" required error={errors.dueDate}><Input id="x-due" type="date" value={v.dueDate} onChange={set("dueDate")} invalid={!!errors.dueDate} /></FormField>
            <FormField id="x-ref" label="Número de referencia / factura"><Input id="x-ref" value={v.referenceNumber} onChange={set("referenceNumber")} /></FormField>
            <FormField id="x-notes" label="Observaciones" className="sm:col-span-2"><Textarea id="x-notes" value={v.notes} onChange={set("notes")} /></FormField>
            <div className="sm:col-span-2">
              <p className="mb-1 text-[13px] font-medium text-slate-700">Comprobante adjunto</p>
              {initialAttachment && !file && <p className="mb-2 text-[13px] text-slate-600">Actual: {initialAttachment.name}</p>}
              <FileInput file={file} onChange={setFile} error={fileError} onError={setFileError} label={initialAttachment ? "Reemplazar archivo" : "Seleccionar archivo"} />
            </div>
          </div>
        </Card>

        <Card title="Periodicidad" subtitle="Para obligaciones que se repiten (HU-40).">
          <div className="space-y-4">
            <Checkbox label="Es recurrente" checked={v.recurring} onChange={(ev) => setV({ ...v, recurring: ev.target.checked, recurrence: ev.target.checked ? v.recurrence : "" })} />
            {v.recurring ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="x-rec" label="Frecuencia de repetición" required error={errors.recurrence}>
                  <Select id="x-rec" value={v.recurrence} onChange={(ev) => setV({ ...v, recurrence: ev.target.value as Recurrence })} invalid={!!errors.recurrence}>
                    <option value="">Seleccione…</option>{(Object.keys(RECURRENCE_LABEL) as Recurrence[]).filter((r) => r !== "NONE").map((r) => <option key={r} value={r}>{RECURRENCE_LABEL[r]}</option>)}
                  </Select>
                </FormField>
                <FormField id="x-end" label="Fecha de fin (opcional)" error={errors.recurrenceEndsOn}><Input id="x-end" type="date" value={v.recurrenceEndsOn} onChange={set("recurrenceEndsOn")} invalid={!!errors.recurrenceEndsOn} /></FormField>
              </div>
            ) : <p className="text-[13px] text-slate-500">Gasto único: se registra una sola fecha de vencimiento.</p>}
          </div>
        </Card>

        <Card title="Recordatorios por correo" subtitle="El servidor enviará los avisos; aquí solo se configuran (HU-41, 42).">
          <div className="space-y-4">
            <Checkbox label="Activar recordatorios por correo" checked={v.notify} onChange={(ev) => setV({ ...v, notify: ev.target.checked })} />
            {v.notify && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="x-days" label="Anticipación (días antes del vencimiento)" required error={errors.notifyDays}><Input id="x-days" inputMode="numeric" value={v.notifyDays} onChange={set("notifyDays")} invalid={!!errors.notifyDays} /></FormField>
                <FormField id="x-rcpt" label="Destinatarios adicionales" error={errors.recipients} hint={`Separe los correos con coma. También se avisará a los destinatarios globales: ${globalRecipients.join(", ") || "ninguno configurado"}.`}>
                  <Input id="x-rcpt" value={v.recipients} onChange={set("recipients")} invalid={!!errors.recipients} placeholder="correo1@ejemplo.cr, correo2@ejemplo.cr" />
                </FormField>
              </div>
            )}
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" href={backHref}>Cancelar</Button>
          <Button type="submit" icon="save" disabled={busy}>Guardar gasto</Button>
        </div>
      </form>
    </>
  );
}
