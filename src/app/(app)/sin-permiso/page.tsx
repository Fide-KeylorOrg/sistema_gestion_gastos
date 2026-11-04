import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default async function SinPermisoPage() {
  await requireUser();
  return (
    <div role="alert" className="mx-auto mt-10 max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center">
      <h1 className="text-lg font-semibold text-slate-900">Acceso denegado</h1>
      <p className="mt-1 text-sm text-slate-600">No tiene permiso para realizar esta acción.</p>
      <Link href="/" className="mt-4 inline-block text-sm font-medium text-blue-700 hover:underline">Ir al inicio</Link>
    </div>
  );
}
