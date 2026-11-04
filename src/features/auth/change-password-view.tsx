"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { services } from "@/services";
import type { FieldErrors } from "@/lib/result";
import { Alert, Button, Card, DemoNotice, FormField, Input, PageHeader, useToast } from "@/components/ui";
import { validateChangePassword } from "@/features/users/validation";
import { PASSWORD_MIN_LENGTH } from "@/lib/validation";

/** HU-13. `forced` representa el escenario 3 (contraseña temporal): no ofrece cancelar ni navegar a otras pantallas. */
export function ChangePasswordView({ forced }: { forced: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const [v, setV] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const local = validateChangePassword(v);
    setErrors(local);
    if (Object.keys(local).length) return;
    setBusy(true);
    const res = await services.users.changeOwnPassword(v);
    setBusy(false);
    if (!res.ok) return setErrors(res.error.fieldErrors ?? { current: res.error.message });
    toast.success("Contraseña actualizada correctamente.");
    setV({ current: "", next: "", confirm: "" });
    if (forced) router.push("/");
  }

  return (
    <>
      <PageHeader title="Cambiar contraseña" subtitle="Mantenga segura su cuenta." />
      <div className="mb-4 max-w-xl space-y-3">
        {forced && <Alert tone="warning" title="Contraseña temporal">Debe definir una contraseña nueva antes de acceder a cualquier otra función.</Alert>}
        <DemoNotice>En esta demostración la contraseña actual es <code className="font-semibold">demo-clave-actual-12</code>. El cambio no afecta su acceso real al sistema.</DemoNotice>
      </div>
      <Card className="max-w-xl">
        <form onSubmit={submit} noValidate className="space-y-4">
          <FormField id="p-current" label="Contraseña actual" required error={errors.current}><Input id="p-current" type="password" autoComplete="current-password" value={v.current} onChange={set("current")} invalid={!!errors.current} /></FormField>
          <FormField id="p-next" label="Contraseña nueva" required error={errors.next} hint={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`}><Input id="p-next" type="password" autoComplete="new-password" value={v.next} onChange={set("next")} invalid={!!errors.next} /></FormField>
          <FormField id="p-confirm" label="Confirmar contraseña nueva" required error={errors.confirm}><Input id="p-confirm" type="password" autoComplete="new-password" value={v.confirm} onChange={set("confirm")} invalid={!!errors.confirm} /></FormField>
          <div className="flex justify-end gap-2">
            {!forced && <Button variant="secondary" href="/">Cancelar</Button>}
            <Button type="submit" icon="key" disabled={busy}>Cambiar contraseña</Button>
          </div>
        </form>
      </Card>
    </>
  );
}
