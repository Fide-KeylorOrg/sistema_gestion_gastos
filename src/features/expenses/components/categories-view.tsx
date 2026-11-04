"use client";

import Link from "next/link";
import { useState } from "react";
import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import { formatCRC, formatDate } from "@/lib/format";
import type { FieldErrors } from "@/lib/result";
import { Badge, Button, Card, ConfirmDialog, DemoNotice, EmptyState, ErrorState, FormField, Input, Loading, Modal, PageHeader, Table, TableWrap, Td, Textarea, Th, THead, Tr, useToast } from "@/components/ui";
import { useSession } from "@/features/access/demo-session";
import { DueStatusBadge } from "./due-status-badge";
import { validateCategory } from "../validation";
import type { CategoryWithCount } from "../types";

export function CategoriesView() {
  const cats = useQuery(["categories"], () => services.expenses.listCategories());
  const { can } = useSession();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<{ category?: CategoryWithCount } | null>(null);
  const [toDeactivate, setToDeactivate] = useState<CategoryWithCount | null>(null);
  const toast = useToast();
  const canCreate = can("gastos.crear");
  const selected = cats.data?.find((c) => c.id === selectedId);

  return (
    <>
      <PageHeader title="Categorías de gastos" subtitle="Clasifique las obligaciones para organizarlas y analizarlas." actions={canCreate && <Button icon="add" onClick={() => setForm({})}>Crear categoría</Button>} />
      <div className="mb-4"><DemoNotice /></div>
      {cats.loading ? <Loading /> : cats.error ? <ErrorState message={cats.error} /> : (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <TableWrap>
              <Table caption="Categorías registradas">
                <THead><Th>Categoría</Th><Th numeric>Gastos</Th><Th>Estado</Th><Th className="text-right">Acciones</Th></THead>
                <tbody>
                  {cats.data!.map((c) => (
                    <Tr key={c.id} className={selectedId === c.id ? "bg-blue-50" : ""}>
                      <Td><span className="font-medium text-slate-900">{c.name}</span>{c.description && <span className="block text-xs text-slate-500">{c.description}</span>}</Td>
                      <Td numeric>{c.expenseCount}</Td>
                      <Td><Badge tone={c.active ? "success" : "neutral"}>{c.active ? "Activa" : "Inactiva"}</Badge></Td>
                      <Td className="text-right"><div className="flex justify-end gap-1">
                        <Button variant="ghost" className="h-8 px-2" onClick={() => setSelectedId(c.id)}>Ver gastos</Button>
                        {canCreate && <Button variant="ghost" className="h-8 px-2" icon="edit" aria-label={`Editar ${c.name}`} onClick={() => setForm({ category: c })} />}
                        {canCreate && c.active && <Button variant="ghost" className="h-8 px-2 text-red-600" icon="block" aria-label={`Desactivar ${c.name}`} onClick={() => setToDeactivate(c)} />}
                      </div></Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          </div>
          <div className="lg:col-span-2">
            <Card title={selected ? `Gastos de: ${selected.name}` : "Gastos por categoría"}>
              {selected ? <CategoryExpenses categoryId={selected.id} /> : <EmptyState message="Seleccione una categoría para ver sus gastos." />}
            </Card>
          </div>
        </div>
      )}
      <CategoryModal state={form} onClose={() => setForm(null)} />
      <ConfirmDialog open={!!toDeactivate} title="Desactivar categoría" message={`La categoría "${toDeactivate?.name}" ya no estará disponible para nuevos gastos. Los gastos existentes la conservan.`} confirmLabel="Desactivar" tone="danger" onCancel={() => setToDeactivate(null)}
        onConfirm={async () => { if (toDeactivate) { await services.expenses.updateCategory(toDeactivate.id, { name: toDeactivate.name, description: toDeactivate.description, active: false }); toast.success("Categoría desactivada."); setToDeactivate(null); } }} />
    </>
  );
}

function CategoryExpenses({ categoryId }: { categoryId: string }) {
  const a = useQuery(["cat-dues", categoryId, "a"], () => services.expenses.listDues({ tab: "active", categoryId }));
  const h = useQuery(["cat-dues", categoryId, "h"], () => services.expenses.listDues({ tab: "history", categoryId }));
  if (a.loading || h.loading) return <Loading />;
  const rows = [...(a.data ?? []), ...(h.data ?? [])];
  const total = rows.reduce((s, r) => s + (r.due.paidAmount ?? r.due.estimatedAmount), 0);
  if (!rows.length) return <EmptyState message="Esta categoría aún no tiene gastos." />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Total registrado: <strong className="tnum">{formatCRC(total)}</strong></p>
      <ul className="divide-y divide-slate-100">
        {rows.map((r) => (
          <li key={r.due.id} className="flex items-center justify-between gap-2 py-2 text-sm">
            <div><Link href={`/gastos/${r.due.id}`} className="font-medium text-blue-700 hover:underline">{r.expense.concept}</Link><p className="text-xs text-slate-500">Vence {formatDate(r.due.dueDate)} · {formatCRC(r.due.paidAmount ?? r.due.estimatedAmount)}</p></div>
            <DueStatusBadge row={r} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoryModal({ state, onClose }: { state: { category?: CategoryWithCount } | null; onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [key, setKey] = useState<string | null>(null);
  const current = state ? state.category?.id ?? "new" : null;
  if (current !== key) {
    setKey(current);
    if (state) { setName(state.category?.name ?? ""); setDescription(state.category?.description ?? ""); setErrors({}); }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const local = validateCategory(name);
    setErrors(local);
    if (Object.keys(local).length) return;
    const res = state?.category ? await services.expenses.updateCategory(state.category.id, { name, description }) : await services.expenses.createCategory({ name, description });
    if (!res.ok) return setErrors(res.error.fieldErrors ?? { name: res.error.message });
    toast.success(state?.category ? "Categoría actualizada correctamente." : "Categoría creada correctamente.");
    onClose();
  }
  return (
    <Modal open={!!state} onClose={onClose} size="sm" title={state?.category ? "Editar categoría" : "Crear categoría"}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="cat-form" icon="save">Guardar</Button></>}>
      <form id="cat-form" onSubmit={submit} noValidate className="space-y-4">
        <FormField id="cat-name" label="Nombre de la categoría" required error={errors.name}><Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} invalid={!!errors.name} /></FormField>
        <FormField id="cat-desc" label="Descripción (opcional)"><Textarea id="cat-desc" value={description} onChange={(e) => setDescription(e.target.value)} /></FormField>
      </form>
    </Modal>
  );
}
