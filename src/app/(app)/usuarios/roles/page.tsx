import { requirePermission } from "@/lib/auth";
import { RolesView } from "@/features/users/components/roles-view";

export default async function RolesPage() {
  await requirePermission("users.manage");
  return <RolesView />;
}
