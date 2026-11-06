"use client";

import { useState } from "react";
import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import type { FieldErrors } from "@/lib/result";
import { Alert, Badge, Button, Card, DemoNotice, EmptyState, ErrorState, FormField, Input, Loading, Modal, PageHeader, useToast } from "@/components/ui";
import { PermissionMatrix, UserStatusBadge } from "./user-parts";
import { validateRoleForm } from "../validation";
import type { PermissionKey } from "@/features/access/types";
import type { RoleSummary } from "../types";

type Mode = { kind: "create" } | { kind: "edit"; role: RoleSummary } | { kind: "view"; roleId: string } | null;

export function RolesView() {
  const roles = useQuery(["roles"], () => services.roles.list());
  const [mode, setMode] = useState<Mode>(null);

  return (
    <>
      <PageHeader title="Roles y permisos" subtitle="Defina qué puede consultar, crear o editar cada rol, incluida la información salarial." actions={<Button icon="add" onClick={() => setMode({ kind: "create" })}>Crear rol</Button>} />
      <div className="mb-4"><DemoNotice /></div>
      {roles.loading ? <Loading /> : roles.error ? <ErrorState message={roles.error} /> : !roles.data?.length ? <EmptyState message="Aún no hay roles registrados." /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.data.map((r) => (
            <Card key={r.id} title={r.name} subtitle={`${r.userCount} ${r.userCount === 1 ? "usuario asignado" : "usuarios asignados"}`}
              actions={r.permissions.includes("planilla.infoSalarial") ? <Badge tone="danger">Ve información salarial</Badge> : undefined}>
              <p className="mb-4 text-sm text-slate-600">{r.permissions.length} {r.permissions.length === 1 ? "permiso" : "permisos"} asignados.</p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setMode({ kind: "view", roleId: r.id })}>Ver detalle</Button>
                <Button variant="ghost" icon="edit" onClick={() => setMode({ kind: "edit", role: r })}>Editar</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <RoleFormModal mode={mode?.kind === "create" || mode?.kind === "edit" ? mode : null} onClose={() => setMode(null)} />
      <RoleDetailModal roleId={mode?.kind === "view" ? mode.roleId : null} onClose={() => setMode(null)} />
    </>
  );
}

function RoleFormModal({ mode, onClose }: { mode: { kind: "create" } | { kind: "edit"; role: RoleSummary } | null; onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [perms, setPerms] = useState<PermissionKey[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirming, setConfirming] = useState(false);
  const [general, setGeneral] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState<string | null>(null);

  const current = mode ? (mode.kind === "edit" ? mode.role.id : "new") : null;
  if (current !== key) {
    setKey(current);
    if (mode) {
      setName(mode.kind === "edit" ? mode.role.name : "");
      setPerms(mode.kind === "edit" ? mode.role.permissions : []);
      setErrors({}); setGeneral(null); setConfirming(false);
    }
  }
  const affected = mode?.kind === "edit" ? mode.role.userCount : 0;

  async function save() {
    if (!mode) return;
    setBusy(true);
    const res = mode.kind === "edit" ? await services.roles.update(mode.role.id, { name, permissions: perms }) : await services.roles.create({ name, permissions: perms });
    setBusy(false);
    if (!res.ok) { setConfirming(false); setErrors(res.error.fieldErrors ?? {}); return setGeneral(res.error.message); }
    toast.success(mode.kind === "edit" ? "Rol actualizado correctamente." : "Rol creado correctamente.");
    onClose();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const local = validateRoleForm({ name, permissions: perms });
    setErrors(local); setGeneral(null);
    if (Object.keys(local).length) return;
    if (mode?.kind === "edit" && affected > 0) return setConfirming(true); // HU-11 esc. 2: confirmar impacto
    void save();
  }

  return (
    <>
      <Modal open={!!mode && !confirming} onClose={onClose} size="lg" title={mode?.kind === "edit" ? `Editar rol: ${mode.role.name}` : "Crear rol"} subtitle="Marque las acciones permitidas en cada módulo."
        footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="role-form" icon="save" disabled={busy}>{mode?.kind === "edit" ? "Guardar cambios" : "Crear rol"}</Button></>}>
        <form id="role-form" onSubmit={submit} noValidate className="space-y-4">
          {general && <Alert tone="danger">{general}</Alert>}
          {mode?.kind === "edit" && affected > 0 && <Alert tone="warning" title="Impacto en usuarios">Resultarán afectados {affected} usuario(s) asignados a este rol. Los cambios se aplican en sus siguientes acciones.</Alert>}
          <FormField id="role-name" label="Nombre del rol" required error={errors.name}><Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} invalid={!!errors.name} /></FormField>
          <div>
            <p className="mb-2 text-[13px] font-medium text-slate-700">Permisos por módulo y acción <span className="text-red-600">*</span></p>
            <PermissionMatrix value={perms} onChange={setPerms} error={errors.permissions} />
          </div>
        </form>
      </Modal>
      <Modal open={confirming} onClose={() => setConfirming(false)} size="sm" title="Confirmar cambios del rol"
        footer={<><Button variant="secondary" onClick={() => setConfirming(false)}>Cancelar</Button><Button onClick={() => void save()} disabled={busy}>Confirmar</Button></>}>
        <p className="text-sm text-slate-600">Este rol tiene <strong>{affected}</strong> usuario(s) asignados. Al guardar, sus permisos cambiarán en sus siguientes acciones. Si cancela, se conservan los permisos anteriores.</p>
      </Modal>
    </>
  );
}

function RoleDetailModal({ roleId, onClose }: { roleId: string | null; onClose: () => void }) {
  const q = useQuery(["role", roleId], () => (roleId ? services.roles.get(roleId) : Promise.resolve(null)));
  return (
    <Modal open={!!roleId} onClose={onClose} size="lg" title={q.data?.name ?? "Detalle del rol"} footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}>
      {!q.data ? <Loading /> : (
        <div className="space-y-5">
          <PermissionMatrix value={q.data.permissions} />
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Usuarios asignados</h3>
            {q.data.users.length === 0 ? <p className="text-sm text-slate-500">Este rol no tiene usuarios asignados.</p> : (
              <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                {q.data.users.map((u) => (
                  <li key={u.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span><span className="font-medium text-slate-900">{u.fullName}</span> <span className="text-slate-500">({u.username})</span></span>
                    <UserStatusBadge active={u.active} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
