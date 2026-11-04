"use client";

import { useState } from "react";
import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import { Alert, Button, Card, DemoNotice, ErrorState, FormField, Input, Loading, PageHeader, useToast } from "@/components/ui";
import { isEmail } from "@/lib/validation";
import { useSession } from "@/features/access/demo-session";

/** HU-41 (anticipación se define por gasto), HU-42 (destinatarios globales) y HU-43 (vista previa del aviso). */
export function NotificationSettingsView() {
  const q = useQuery(["notif-settings"], () => services.expenses.getNotificationSettings());
  const toast = useToast();
  const { can } = useSession();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();

  if (q.loading) return <Loading />;
  if (q.error || !q.data) return <ErrorState message={q.error ?? "Sin datos"} />;
  const list = q.data.globalRecipients;
  const editable = can("gastos.editar");

  async function save(next: string[], message: string) {
    const res = await services.expenses.updateNotificationSettings({ globalRecipients: next });
    if (res.ok) toast.success(message);
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const v = email.trim().toLowerCase();
    if (!v) return setError("Ingrese un correo electrónico.");
    if (!isEmail(v)) return setError("Ingrese un correo electrónico válido.");
    if (list.includes(v)) return setError("Este correo ya está en la lista.");
    setError(undefined);
    setEmail("");
    await save([...list, v], "Destinatarios actualizados.");
  }

  return (
    <>
      <PageHeader title="Notificaciones de vencimientos" subtitle="Destinatarios globales de los recordatorios por correo." />
      <div className="mb-4 space-y-3">
        <DemoNotice />
        <Alert tone="info" title="Envío a cargo del servidor">El envío de correos y su programación los realizará el backend. Aquí se configuran los destinatarios; los días de anticipación y los destinatarios adicionales se definen en cada gasto.</Alert>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Destinatarios globales" subtitle="Reciben el aviso de todos los gastos con recordatorios activos.">
          {list.length === 0 ? <p className="mb-3 text-sm text-slate-500">No hay destinatarios configurados.</p> : (
            <ul className="mb-4 divide-y divide-slate-100 rounded-md border border-slate-200">
              {list.map((r) => (
                <li key={r} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{r}</span>
                  {editable && <Button variant="ghost" className="h-8 px-2 text-red-600" icon="delete" aria-label={`Quitar ${r}`} onClick={() => save(list.filter((x) => x !== r), "Destinatarios actualizados.")} />}
                </li>
              ))}
            </ul>
          )}
          {editable && (
            <form onSubmit={add} noValidate className="flex items-end gap-2">
              <FormField id="n-email" label="Agregar correo" error={error} className="flex-1"><Input id="n-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!error} /></FormField>
              <Button type="submit" icon="add">Agregar</Button>
            </form>
          )}
        </Card>
        <Card title="Vista previa del aviso" subtitle="Ejemplo ilustrativo del correo que enviará el servidor.">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Asunto: Obligación próxima a vencer: Factura de mantenimiento cámaras de frío</p>
            <p className="mt-3">Le recordamos que la siguiente obligación vence el <strong>05/11/2026</strong>:</p>
            <ul className="mt-2 list-inside list-disc"><li>Concepto: Factura de mantenimiento cámaras de frío</li><li>Categoría: Mantenimiento y reparación</li><li>Monto estimado: ₡385 000,00</li></ul>
            <p className="mt-3 text-xs text-slate-500">No se envía aviso si el gasto ya fue pagado. Si el pago se revierte, los recordatorios se reactivan.</p>
          </div>
        </Card>
      </div>
    </>
  );
}
