"use client";

import Link from "next/link";
import { useState } from "react";
import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import { usePagination } from "@/lib/use-pagination";
import { formatDateTime } from "@/lib/format";
import type { FieldErrors } from "@/lib/result";
import { Button, Card, DemoNotice, EmptyState, ErrorState, FormField, Input, Loading, Modal, PageHeader, Pagination, Select, Table, TableWrap, Td, Th, THead, Tr, useToast } from "@/components/ui";
import { UserStatusBadge } from "./user-parts";
import { generateTemporaryPassword, validateUserForm } from "../validation";
import { useSession } from "@/features/access/demo-session";
import type { UserFilters } from "../types";

export function UsersListView() {
  const [filters, setFilters] = useState<UserFilters>({ search: "", roleId: "", active: "all" });
  const [creating, setCreating] = useState(false);
  const users = useQuery(["users", filters], () => services.users.list(filters));
  const { roles } = useSession();
  const pager = usePagination(users.data ?? [], 8);
  const hasFilters = !!filters.search || !!filters.roleId || filters.active !== "all";

  return (
    <>
      <PageHeader
        title="Usuarios"
        subtitle="Cuentas con acceso al sistema, su rol y su estado."
        actions={<Button icon="person_add" onClick={() => setCreating(true)}>Crear usuario</Button>}
      />
      <div className="mb-4"><DemoNotice /></div>

      <Card padded={false}>
        <form className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[1fr_200px_160px_auto]" role="search" onSubmit={(e) => e.preventDefault()}>
          <FormField id="f-search" label="Buscar por nombre o usuario">
            <Input id="f-search" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Ej.: Calderón o lcalderon" />
          </FormField>
          <FormField id="f-role" label="Rol">
            <Select id="f-role" value={filters.roleId} onChange={(e) => setFilters({ ...filters, roleId: e.target.value })}>
              <option value="">Todos</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          </FormField>
          <FormField id="f-active" label="Estado">
            <Select id="f-active" value={filters.active} onChange={(e) => setFilters({ ...filters, active: e.target.value as UserFilters["active"] })}>
              <option value="all">Todos</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </Select>
          </FormField>
          <div className="flex items-end">
            <Button variant="secondary" icon="filter_alt_off" onClick={() => setFilters({ search: "", roleId: "", active: "all" })} disabled={!hasFilters}>Limpiar filtros</Button>
          </div>
        </form>

        <div className="p-4">
          {users.loading ? <Loading /> : users.error ? <ErrorState message={users.error} /> : pager.total === 0 ? (
            <EmptyState message="No se encontraron usuarios con los criterios indicados." action={<Button variant="secondary" onClick={() => setFilters({ search: "", roleId: "", active: "all" })}>Limpiar filtros</Button>} />
          ) : (
            <>
              <TableWrap>
                <Table caption="Usuarios del sistema">
                  <THead><Th>Nombre completo</Th><Th>Usuario</Th><Th>Correo</Th><Th>Rol</Th><Th>Estado</Th><Th>Último acceso</Th><Th className="text-right">Acciones</Th></THead>
                  <tbody>
                    {pager.pageItems.map((u) => (
                      <Tr key={u.id}>
                        <Td className="font-medium text-slate-900">{u.fullName}</Td>
                        <Td>{u.username}</Td>
                        <Td>{u.email}</Td>
                        <Td>{u.roleName}</Td>
                        <Td><UserStatusBadge active={u.active} /></Td>
                        <Td>{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Nunca"}</Td>
                        <Td className="text-right"><Link href={`/usuarios/${u.id}`} className="font-medium text-blue-700 hover:underline">Ver detalle</Link></Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
              <Pagination {...pager} onPage={pager.setPage} />
            </>
          )}
        </div>
      </Card>

      <CreateUserModal open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

function CreateUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { roles } = useSession();
  const toast = useToast();
  const empty = { fullName: "", username: "", email: "", roleId: "", temporaryPassword: "" };
  const [v, setV] = useState(empty);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [general, setGeneral] = useState<string | null>(null);

  const close = () => {
    setV(empty);
    setErrors({});
    setGeneral(null);
    onClose();
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const local = validateUserForm(v, { requirePassword: true });
    setErrors(local);
    setGeneral(null);
    if (Object.keys(local).length) return;
    setBusy(true);
    const res = await services.users.create(v);
    setBusy(false);
    if (!res.ok) {
      setErrors(res.error.fieldErrors ?? {});
      setGeneral(res.error.message);
      return;
    }
    toast.success("Usuario creado correctamente.");
    close();
  }

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  return (
    <Modal
      open={open}
      onClose={close}
      title="Crear usuario"
      subtitle="El usuario deberá cambiar su contraseña en el primer inicio de sesión."
      footer={<><Button variant="secondary" onClick={close}>Cancelar</Button><Button type="submit" form="create-user" icon="save" disabled={busy}>Crear usuario</Button></>}
    >
      <form id="create-user" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        {general && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{general}</p>}
        <FormField id="c-fullName" label="Nombre completo" required error={errors.fullName} className="sm:col-span-2">
          <Input id="c-fullName" value={v.fullName} onChange={set("fullName")} invalid={!!errors.fullName} />
        </FormField>
        <FormField id="c-username" label="Nombre de usuario" required error={errors.username}>
          <Input id="c-username" value={v.username} onChange={set("username")} invalid={!!errors.username} autoComplete="off" />
        </FormField>
        <FormField id="c-email" label="Correo electrónico" required error={errors.email}>
          <Input id="c-email" type="email" value={v.email} onChange={set("email")} invalid={!!errors.email} />
        </FormField>
        <FormField id="c-role" label="Rol asignado" required error={errors.roleId}>
          <Select id="c-role" value={v.roleId} onChange={set("roleId")} invalid={!!errors.roleId}>
            <option value="">Seleccione…</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </FormField>
        <FormField id="c-pass" label="Contraseña temporal" required error={errors.temporaryPassword} hint="Mínimo 12 caracteres. Se almacena cifrada.">
          <div className="flex gap-2">
            <Input id="c-pass" value={v.temporaryPassword} onChange={set("temporaryPassword")} invalid={!!errors.temporaryPassword} autoComplete="off" />
            <Button variant="secondary" icon="refresh" aria-label="Generar contraseña segura" onClick={() => setV({ ...v, temporaryPassword: generateTemporaryPassword() })} />
          </div>
        </FormField>
      </form>
    </Modal>
  );
}
