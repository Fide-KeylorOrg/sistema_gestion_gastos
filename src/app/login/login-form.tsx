"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { login, type LoginState } from "./actions";

// La acción `login` (servidor) ya existía y no se modificó: HU-1 (credenciales, campos vacíos y cuenta inactiva).
export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [show, setShow] = useState(false);

  return (
    <form action={action} noValidate className="space-y-4">
      {state.error && <Alert tone="danger">{state.error}</Alert>}

      <FormField id="username" label="Usuario" required error={state.fieldErrors?.username}>
        <Input id="username" name="username" autoComplete="username" defaultValue={state.username} invalid={!!state.fieldErrors?.username} autoFocus />
      </FormField>

      <FormField id="password" label="Contraseña" required error={state.fieldErrors?.password}>
        <div className="relative">
          <Input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" invalid={!!state.fieldErrors?.password} className="pr-10" />
          <button
            type="button"
            aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-800"
          >
            <Icon name={show ? "visibility_off" : "visibility"} />
          </button>
        </div>
      </FormField>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Ingresando…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}
