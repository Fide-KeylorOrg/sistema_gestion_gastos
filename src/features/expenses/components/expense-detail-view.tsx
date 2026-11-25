"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import { addDays, formatBytes, formatCRC, formatDate, formatDateTime } from "@/lib/format";
import type { FieldErrors } from "@/lib/result";
import { Alert, Badge, Button, Card, ConfirmDialog, DemoNotice, EmptyState, ErrorState, FileInput, FormField, Input, Loading, Modal, PageHeader, Textarea, useToast } from "@/components/ui";
import { useSession } from "@/features/access/demo-session";
import { DueStatusBadge } from "./due-status-badge";
import { parsePaymentForm, validateVoidReason } from "../validation";
import { RECURRENCE_LABEL, type Attachment } from "../types";
import { DEMO_TODAY } from "@/services/demo/clock";

type Dialog = "pay" | "void" | "delete" | "finalize" | null;

export function ExpenseDetailView({ dueId }: { dueId: string }) {
  const q = useQuery(["due", dueId], () => services.expenses.getDue(dueId));
  const settings = useQuery(["notif-settings"], () => services.expenses.getNotificationSettings());
  const router = useRouter();
  const toast = useToast();
  const { can } = useSession();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  if (q.loading) return <Loading />;
  if (q.error) return <ErrorState message={q.error} />;
  if (!q.data) return <><PageHeader title="Gasto no encontrado" backHref="/gastos" backLabel="Volver a gastos" /><EmptyState message="El gasto solicitado no existe." /></>;
  const { due, payment, expense, categoryName, status, history, nextDue, voidedPayments } = q.data;
  const paid = status === "PAID";
  const canEdit = can("expenses.edit");
  const close = () => { setDialog(null); setProblem(null); };

  async function run(fn: () => Promise<{ ok: boolean; error?: { message: string } }>, success: string, after?: () => void) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (!res.ok) return setProblem(res.error?.message ?? "No se pudo completar la acción.");
    close();
    toast.success(success);
    after?.();
  }

  const notifyDate = expense.notifyDaysBefore !== null ? addDays(due.dueDate, -expense.notifyDaysBefore) : null;
  const recipients = [...(settings.data?.globalRecipients ?? []), ...expense.extraRecipients];

  return (
    <>
      <PageHeader
        title={expense.concept}
        subtitle={<span className="inline-flex flex-wrap items-center gap-2">{categoryName} · <DueStatusBadge row={q.data} /></span>}
        backHref="/gastos"
        backLabel="Volver a gastos"
        actions={canEdit && (
          <>
            {!paid && <Button icon="check_circle" onClick={() => setDialog("pay")}>Marcar como pagado</Button>}
            {paid && <Button variant="secondary" icon="history" onClick={() => setDialog("void")}>Anular pago</Button>}
            <Button variant="secondary" icon="edit" href={`/gastos/${expense.id}/editar`}>Editar gasto</Button>
            {expense.recurrence !== "NONE" && !expense.recurrenceEndsOn && <Button variant="secondary" icon="event_busy" onClick={() => setDialog("finalize")}>Finalizar recurrencia</Button>}
            <Button variant="danger" icon="delete" onClick={() => setDialog("delete")}>Eliminar</Button>
          </>
        )}
      />
      <div className="mb-4 space-y-3">
        <DemoNotice />
        {paid && nextDue && <Alert tone="info" title="Siguiente vencimiento generado">Por ser recurrente, se creó el vencimiento del {formatDate(nextDue.dueDate)}. <Link className="font-medium text-blue-700 hover:underline" href={`/gastos/${nextDue.id}`}>Ver</Link></Alert>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Información general">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Item label="Categoría" value={categoryName} />
              <Item label="Tipo" value={expense.kind === "PERMIT" ? "Permiso (sanitario o comercial)" : "Pago / obligación"} />
              <Item label="Monto estimado" value={formatCRC(due.estimatedAmount)} />
              <Item label="Monto pagado" value={payment ? formatCRC(payment.amount) : "—"} />
              <Item label="Fecha de vencimiento" value={formatDate(due.dueDate)} />
              <Item label="Fecha de pago" value={formatDate(payment?.paidAt)} />
              <Item label="Número de referencia" value={expense.referenceNumber ?? "—"} />
              <Item label="Recurrencia" value={RECURRENCE_LABEL[expense.recurrence] + (expense.recurrenceEndsOn ? ` (hasta ${formatDate(expense.recurrenceEndsOn)})` : "")} />
            </dl>
          </Card>
          <Card title="Observaciones">{expense.notes ? <p className="text-sm text-slate-700">{expense.notes}</p> : <p className="text-sm text-slate-500">Sin observaciones registradas.</p>}</Card>
          <Card title="Comprobantes">
            <div className="space-y-3 text-sm">
              <Doc label="Comprobante del gasto" a={expense.attachment} />
              <Doc label="Comprobante del pago" a={payment?.receipt} />
            </div>
            {voidedPayments.length > 0 && (
              <ul className="mt-4 space-y-2 text-sm">
                {voidedPayments.map((p) => (
                  <li key={p.id} className="rounded-md border border-slate-200 p-3">
                    <Badge tone="neutral">Anulado</Badge> <span className="font-medium text-slate-900">{formatCRC(p.amount)}</span> pagado el {formatDate(p.paidAt)}
                    <p className="text-slate-600">Motivo: {p.voidReason} · anulado {formatDateTime(p.voidedAt!)}{p.receipt && ` · comprobante: ${p.receipt.name}`}</p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-slate-500">La descarga real estará disponible cuando el backend almacene los archivos.</p>
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Recordatorios">
            {expense.notifyDaysBefore === null ? <p className="text-sm text-slate-500">Avisos desactivados para este gasto.</p> : paid ? <p className="text-sm text-slate-500">El gasto está pagado: no se enviarán avisos.</p> : (
              <ul className="space-y-2 text-sm text-slate-700">
                <li><strong>{expense.notifyDaysBefore}</strong> días antes del vencimiento</li>
                <li>Próximo aviso: <strong>{formatDate(notifyDate)}</strong></li>
                <li className="break-words">Destinatarios: {recipients.join(", ") || "ninguno configurado"}</li>
              </ul>
            )}
            <p className="mt-3 text-xs text-slate-500">El envío del correo lo realizará el servidor.</p>
          </Card>
          <Card title="Historial de cambios">
            {history.length === 0 ? <p className="text-sm text-slate-500">Sin cambios registrados.</p> : (
              <ol className="space-y-3">
                {history.map((h) => (
                  <li key={h.id} className="border-l-2 border-slate-200 pl-3 text-sm">
                    <p className="font-semibold text-slate-900">{h.action}</p>
                    <p className="text-slate-600">{h.detail}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(h.at)} · {h.actorName}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>

      <PayModal open={dialog === "pay"} onClose={close} estimated={due.estimatedAmount} recurring={expense.recurrence !== "NONE"} onSave={(input, onDone) => run(() => services.expenses.markPaid(dueId, input), "Pago registrado correctamente.", onDone)} busy={busy} problem={problem} />
      <VoidDialog open={dialog === "void"} onClose={close} busy={busy} problem={problem} onSave={(reason) => run(() => services.expenses.voidPayment(dueId, reason), "Pago anulado; el gasto volvió a pendiente.")} />
      <ConfirmDialog open={dialog === "delete"} title="¿Desea eliminar este gasto?" message="El gasto dejará de aparecer en los registros activos." tone="danger" confirmLabel="Eliminar gasto" busy={busy} onCancel={close} onConfirm={() => run(() => services.expenses.remove(expense.id), "Gasto eliminado correctamente.", () => router.push("/gastos"))}>{problem && <Alert tone="danger">{problem}</Alert>}</ConfirmDialog>
      <FinalizeModal open={dialog === "finalize"} onClose={close} busy={busy} problem={problem} onSave={(d) => run(() => services.expenses.finalizeRecurrence(expense.id, d), "Recurrencia finalizada.")} />
    </>
  );
}

const Item = ({ label, value }: { label: string; value: string }) => (
  <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-0.5 font-medium text-slate-900">{value}</dd></div>
);

function Doc({ label, a }: { label: string; a?: Attachment }) {
  return a ? (
    <div className="flex items-center justify-between gap-2 rounded-md border border-slate-200 p-3">
      <span><span className="block text-xs text-slate-500">{label}</span><span className="font-medium text-slate-900">{a.name}</span> <span className="text-slate-500">({formatBytes(a.size)})</span></span>
      <Badge tone="neutral">Adjunto</Badge>
    </div>
  ) : <p className="text-slate-500">{label}: ninguno adjunto.</p>;
}

function PayModal({ open, onClose, estimated, recurring, onSave, busy, problem }: {
  open: boolean; onClose: () => void; estimated: number; recurring: boolean; busy: boolean; problem: string | null;
  onSave: (input: { paidAt: string; paidAmount: number; receipt?: Attachment }, onDone?: () => void) => void;
}) {
  const [v, setV] = useState({ paidAt: DEMO_TODAY, amount: String(estimated) });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) { setV({ paidAt: DEMO_TODAY, amount: String(estimated) }); setFile(null); setErrors({}); setFileError(undefined); }
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = parsePaymentForm(v);
    setErrors(p.errors);
    if (!p.paidAt || fileError) return;
    onSave({ paidAt: p.paidAt, paidAmount: p.amount!, receipt: file ? { name: file.name, size: file.size, uploadedAt: new Date().toISOString() } : undefined });
  }
  return (
    <Modal open={open} onClose={onClose} size="sm" title="Registrar pago" subtitle={`Monto estimado: ${formatCRC(estimated)}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="pay-form" icon="check_circle" disabled={busy}>Confirmar pago</Button></>}>
      <form id="pay-form" onSubmit={submit} noValidate className="space-y-4">
        {problem && <Alert tone="danger">{problem}</Alert>}
        <FormField id="pay-amount" label="Monto realmente pagado (₡)" required error={errors.amount}><Input id="pay-amount" inputMode="decimal" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} invalid={!!errors.amount} /></FormField>
        <FormField id="pay-date" label="Fecha de pago" required error={errors.paidAt}><Input id="pay-date" type="date" value={v.paidAt} onChange={(e) => setV({ ...v, paidAt: e.target.value })} invalid={!!errors.paidAt} /></FormField>
        <div><p className="mb-1 text-[13px] font-medium text-slate-700">Comprobante de pago</p><FileInput file={file} onChange={setFile} error={fileError} onError={setFileError} /></div>
        {recurring && <p className="text-xs text-slate-500">Al registrar el pago se creará automáticamente el siguiente vencimiento.</p>}
      </form>
    </Modal>
  );
}

/** HU-39: el pago queda como Anulado con su motivo; el gasto vuelve a pendiente o vencido. */
function VoidDialog({ open, onClose, onSave, busy, problem }: { open: boolean; onClose: () => void; onSave: (reason: string) => void; busy: boolean; problem: string | null }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) { setWasOpen(open); if (open) { setReason(""); setError(undefined); } }
  function confirm() {
    const errors = validateVoidReason(reason);
    setError(errors.reason);
    if (!errors.reason) onSave(reason);
  }
  return (
    <ConfirmDialog open={open} title="Anular pago" message="El pago quedará como Anulado en el historial, con su fecha, monto, comprobante y motivo. El gasto volverá a pendiente o vencido según su fecha." confirmLabel="Anular pago" tone="danger" busy={busy} onCancel={onClose} onConfirm={confirm}>
      <FormField id="void-reason" label="Motivo de la anulación" required error={error}><Textarea id="void-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} invalid={!!error} /></FormField>
      {problem && <Alert tone="danger" className="mt-3">{problem}</Alert>}
    </ConfirmDialog>
  );
}

function FinalizeModal({ open, onClose, onSave, busy, problem }: { open: boolean; onClose: () => void; onSave: (date: string) => void; busy: boolean; problem: string | null }) {
  const [date, setDate] = useState(DEMO_TODAY);
  const [error, setError] = useState<string>();
  const [confirm, setConfirm] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) { setWasOpen(open); if (open) { setDate(DEMO_TODAY); setError(undefined); setConfirm(false); } }
  return (
    <Modal open={open} onClose={onClose} size="sm" title="Finalizar recurrencia"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button>
        {confirm ? <Button variant="danger" onClick={() => onSave(date)} disabled={busy}>Confirmar</Button> : <Button onClick={() => (date ? setConfirm(true) : setError("Indique la fecha de fin."))}>Continuar</Button>}</>}>
      {confirm ? <p className="text-sm text-slate-600">El sistema dejará de generar vencimientos después del {formatDate(date)}. Los vencimientos pendientes anteriores a esa fecha se conservan en alertas, calendario y dashboard.</p> : (
        <FormField id="fin-date" label="Fecha de fin" required error={error}><Input id="fin-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} invalid={!!error} /></FormField>
      )}
      {problem && <Alert tone="danger" className="mt-3">{problem}</Alert>}
    </Modal>
  );
}
