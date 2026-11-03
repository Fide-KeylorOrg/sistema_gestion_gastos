"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} noValidate>
      {state.error && <p role="alert">{state.error}</p>}

      <label htmlFor="username">Usuario</label>
      <input
        id="username"
        name="username"
        autoComplete="username"
        defaultValue={state.username}
        aria-invalid={!!state.fieldErrors?.username}
        aria-describedby={state.fieldErrors?.username ? "username-error" : undefined}
        autoFocus
      />
      {state.fieldErrors?.username && <p id="username-error">{state.fieldErrors.username}</p>}

      <label htmlFor="password">Contraseña</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        aria-invalid={!!state.fieldErrors?.password}
        aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
      />
      {state.fieldErrors?.password && <p id="password-error">{state.fieldErrors.password}</p>}

      <button type="submit" disabled={pending}>
        {pending ? "Ingresando…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
