import { requirePermission } from "@/lib/auth";
import { UsersListView } from "@/features/users/components/users-list-view";

export default async function UsuariosPage() {
  await requirePermission("users.manage");
  return <UsersListView />;
}
