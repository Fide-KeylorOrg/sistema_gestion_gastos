"use client";

import { useState } from "react";
import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import { formatDateTime } from "@/lib/format";
import type { FieldErrors } from "@/lib/result";
import { Alert, Badge, Button, Card, ConfirmDialog, DemoNotice, EmptyState, ErrorState, FormField, Input, Loading, Modal, PageHeader, Select, useToast } from "@/components/ui";
import { PermissionMatrix, UserStatusBadge } from "./user-parts";
import { USER_CHANGE_LABEL } from "../types";
import { validateUserForm } from "../validation";
import { useSession } from "@/features/access/demo-session";

export function UserDetailView({ id }: { id: string }) {
  const q = useQuery(["user", id], () => services.users.get(id));
  const toast = useToast();
  const [modal, setModal] = useState<"edit" | "role" | "toggle" | "reset" | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  if (q.loading) return <Loading />;
  if (q.error) return <ErrorState message={q.error} />;
  if (!q.data) return <><PageHeader title="Usuario no encontrado" backHref="/usuarios" backLabel="Volver a usuarios" /><EmptyState message="El usuario solicitado no existe." /></>;
  const { user, role, changes } = q.data;

  async function toggle() {
    setBusy(true);
    const res = await services.users.setActive(id, !user.active);
    setBusy(false);
    if (!res.ok) return setProblem(res.error.message);
    setModal(null);
    toast.success(user.active ? "Usuario desactivado correctamente." : "Usuario activado correctamente.");
  }
  async function reset() {
    setBusy(true);
    const res = await services.users.resetPassword(id);
    setBusy(false);
    if (!res.ok) return setProblem(res.error.message);
    setModal(null);
    setTempPassword(res.data.temporaryPassword);
  }
  const closeModal = () => { setModal(null); setProblem(null); };

  return (
    <>
      <PageHeader
        title={user.fullName}
        subtitle={`Usuario ${user.username}`}
        backHref="/usuarios"
        backLabel="Volver a usuarios"
        actions={
          <>
            <Button variant="secondary" icon="edit" onClick={() => setModal("edit")}>Editar datos</Button>
            <Button variant="secondary" icon="admin_panel_settings" onClick={() => setModal("role")}>Cambiar rol</Button>
            <Button variant="secondary" icon="lock_reset" onClick={() => { setProblem(null); setModal("reset"); }}>Restablecer contraseña</Button>
            <Button variant={user.active ? "danger" : "primary"} icon={user.active ? "block" : "check_circle"} onClick={() => { setProblem(null); setModal("toggle"); }}>
              {user.active ? "Desactivar" : "Activar"}
            </Button>
          </>
        }
      />
      <div className="mb-4"><DemoNotice /></div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Datos de la cuenta" className="lg:col-span-1">
          <dl className="space-y-3 text-sm">
            <Row label="Nombre completo" value={user.fullName} />
            <Row label="Nombre de usuario" value={user.username} />
            <Row label="Correo electrónico" value={user.email} />
            <Row label="Rol" value={role.name} />
            <Row label="Estado" value={<UserStatusBadge active={user.active} />} />
            <Row label="Fecha de creación" value={formatDateTime(user.createdAt)} />
            <Row label="Último inicio de sesión" value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Nunca ha iniciado sesión"} />
            {user.mustChangePassword && <Row label="Contraseña" value={<Badge tone="warning">Debe cambiarla al ingresar</Badge>} />}
          </dl>
          <p className="mt-4 text-xs text-slate-500">Por seguridad, la contraseña nunca se muestra.</p>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card title="Permisos efectivos del rol" subtitle={role.name}>
            <PermissionMatrix value={role.permissions} />
          </Card>
          <Card title="Historial de cambios de la cuenta" subtitle="Del más reciente al más antiguo">
            {changes.length === 0 ? (
              <EmptyState message="No hay cambios registrados para este usuario desde su creación." />
            ) : (
              <ol className="space-y-3">
                {changes.map((c) => (
                  <li key={c.id} className="rounded-md border border-slate-200 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{USER_CHANGE_LABEL[c.action]}</span>
                      <span className="tnum text-xs text-slate-500">{formatDateTime(c.at)}</span>
                    </div>
                    <p className="text-slate-600">{c.detail}</p>
                    <p className="text-xs text-slate-500">Realizado por {c.actorName}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>

      <EditUserModal open={modal === "edit"} onClose={closeModal} userId={id} initial={{ fullName: user.fullName, username: user.username, email: user.email }} />
      <ChangeRoleModal open={modal === "role"} onClose={closeModal} userId={id} currentRoleId={user.roleId} />

      <ConfirmDialog
        open={modal === "toggle"}
        title={user.active ? "Desactivar usuario" : "Activar usuario"}
        message={user.active ? `¿Desea desactivar a ${user.fullName}? Se conservarán sus datos y registros, se cerrarán sus sesiones abiertas y no podrá iniciar sesión.` : `¿Desea activar a ${user.fullName}? Conservará su rol y podrá iniciar sesión.`}
        confirmLabel={user.active ? "Desactivar" : "Activar"}
        tone={user.active ? "danger" : "primary"}
        busy={busy}
        onConfirm={toggle}
        onCancel={closeModal}
      >
        {problem && <Alert tone="danger">{problem}</Alert>}
      </ConfirmDialog>

      <ConfirmDialog
        open={modal === "reset"}
        title="Restablecer contraseña"
        message="Se asignará una contraseña temporal, que se mostrará una única vez. La contraseña anterior dejará de funcionar y el usuario deberá cambiarla en su siguiente inicio de sesión."
        confirmLabel="Restablecer"
        busy={busy}
        onConfirm={reset}
        onCancel={closeModal}
      >
        {problem && <Alert tone="danger">{problem}</Alert>}
      </ConfirmDialog>

      <Modal open={tempPassword !== null} onClose={() => setTempPassword(null)} title="Contraseña temporal" size="sm" footer={<Button onClick={() => setTempPassword(null)}>Entendido</Button>}>
        <p className="mb-3 text-sm text-slate-600">Entregue esta contraseña al usuario. <strong>No se volverá a mostrar</strong> y no queda guardada en la bitácora.</p>
        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
          <code className="flex-1 break-all text-base font-semibold text-slate-900">{tempPassword}</code>
          <Button variant="secondary" icon="content_copy" onClick={() => tempPassword && navigator.clipboard?.writeText(tempPassword).then(() => toast.info("Contraseña copiada."))}>Copiar</Button>
        </div>
      </Modal>
    </>
  );
}

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
    <dt className="text-slate-500">{label}</dt>
    <dd className="font-medium text-slate-900">{value}</dd>
  </div>
);

function EditUserModal({ open, onClose, userId, initial }: { open: boolean; onClose: () => void; userId: string; initial: { fullName: string; username: string; email: string } }) {
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) { setV(initial); setErrors({}); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const local = validateUserForm({ ...v, roleId: "x" }, { requirePassword: false });
    setErrors(local);
    if (Object.keys(local).length) return;
    setBusy(true);
    const res = await services.users.update(userId, v);
    setBusy(false);
    if (!res.ok) return setErrors(res.error.fieldErrors ?? {});
    toast.success("Usuario actualizado correctamente.");
    onClose();
  }
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  return (
    <Modal open={open} onClose={onClose} title="Editar datos del usuario" footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="edit-user" icon="save" disabled={busy}>Guardar cambios</Button></>}>
      <form id="edit-user" onSubmit={submit} noValidate className="space-y-4">
        <FormField id="e-fullName" label="Nombre completo" required error={errors.fullName}><Input id="e-fullName" value={v.fullName} onChange={set("fullName")} invalid={!!errors.fullName} /></FormField>
        <FormField id="e-username" label="Nombre de usuario" required error={errors.username}><Input id="e-username" value={v.username} onChange={set("username")} invalid={!!errors.username} /></FormField>
        <FormField id="e-email" label="Correo electrónico" required error={errors.email}><Input id="e-email" type="email" value={v.email} onChange={set("email")} invalid={!!errors.email} /></FormField>
      </form>
    </Modal>
  );
}

function ChangeRoleModal({ open, onClose, userId, currentRoleId }: { open: boolean; onClose: () => void; userId: string; currentRoleId: string }) {
  const { roles } = useSession();
  const toast = useToast();
  const [roleId, setRoleId] = useState(currentRoleId);
  const [error, setError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) { setRoleId(currentRoleId); setError(null); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!roleId) return setError("El rol es obligatorio.");
    const res = await services.users.changeRole(userId, roleId);
    if (!res.ok) return setError(res.error.message);
    toast.success("Rol actualizado correctamente.");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Cambiar rol" size="sm" footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="change-role" icon="save">Guardar</Button></>}>
      <form id="change-role" onSubmit={submit} noValidate>
        <FormField id="r-role" label="Rol" required error={error ?? undefined}>
          <Select id="r-role" value={roleId} onChange={(e) => setRoleId(e.target.value)} invalid={!!error}>
            <option value="">Seleccione…</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </FormField>
      </form>
    </Modal>
  );
}
