import { requireUser } from "@/lib/auth";

export default async function SinPermisoPage() {
  await requireUser();
  return <p role="alert">No tiene permiso para realizar esta acción.</p>;
}
