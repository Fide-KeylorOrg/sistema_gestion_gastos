import { requirePermission } from "@/lib/auth";

export default async function UsuariosPage() {
  await requirePermission("users.manage");
  return <h1>Usuarios y roles</h1>;
}
