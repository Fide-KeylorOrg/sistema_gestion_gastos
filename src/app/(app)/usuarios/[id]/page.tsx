import { requirePermission } from "@/lib/auth";
import { UserDetailView } from "@/features/users/components/user-detail-view";

export default async function UsuarioDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("users.manage");
  const { id } = await params;
  return <UserDetailView id={id} />;
}
