import Image from "next/image";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image unoptimized src="/logo.png" alt="Centro Comercial Los Ángeles" width={96} height={96} className="size-24 rounded-xl border border-slate-200 bg-white p-1" priority />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Supermercado Los Ángeles</h1>
          <p className="text-sm text-slate-500">Sistema de gestión de gastos administrativos</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_1px_2px_0_rgba(15,23,42,0.05)]">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Iniciar sesión</h2>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
