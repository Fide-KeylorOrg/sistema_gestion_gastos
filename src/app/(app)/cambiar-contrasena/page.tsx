import { requireUser } from "@/lib/auth";
import { ChangePasswordView } from "@/features/auth/change-password-view";

export default async function CambiarContrasenaPage({ searchParams }: { searchParams: Promise<{ obligatorio?: string }> }) {
  await requireUser();
  const { obligatorio } = await searchParams;
  return <ChangePasswordView forced={obligatorio === "1"} />;
}
