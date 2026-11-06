"use client";

import { useRef, useState } from "react";
import { services } from "@/services";
import { formatBytes, formatDate, formatDateTime } from "@/lib/format";
import { fileProblem } from "@/lib/validation";
import type { FieldErrors } from "@/lib/result";
import { Alert, Button, ConfirmDialog, EmptyState, FileInput, FormField, Input, Modal, Select, Table, TableWrap, Td, Th, THead, Tr, useToast } from "@/components/ui";
import { DOCUMENT_TYPES_WITH_EXPIRY, DOCUMENT_TYPE_LABEL, type DocumentType, type EmployeeDocument } from "../types";
import { validateDocument } from "../validation";

/** HU-33 (adjuntar) y HU-34 (consultar, descargar, reemplazar y eliminar con confirmación). */
export function DocumentsTab({ employeeId, records, canEdit }: { employeeId: string; records: EmployeeDocument[]; canEdit: boolean }) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<EmployeeDocument | null>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<string | null>(null);

  async function onReplace(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !replaceTarget.current) return;
    const problem = fileProblem(f);
    if (problem) return toast.error(problem);
    const res = await services.employees.replaceDocument(employeeId, replaceTarget.current, { fileName: f.name, size: f.size });
    if (res.ok) toast.success("Documento reemplazado; el cambio quedó registrado.");
  }
  async function remove() {
    if (!removing) return;
    const res = await services.employees.removeDocument(employeeId, removing.id);
    if (res.ok) toast.success("Documento eliminado de la lista activa.");
    setRemoving(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">{canEdit && <Button icon="upload_file" onClick={() => setAdding(true)}>Adjuntar documento</Button>}</div>
      <input ref={replaceInput} type="file" className="sr-only" aria-label="Seleccionar nueva versión del documento" accept=".pdf,.jpg,.jpeg,.png" onChange={onReplace} />
      {records.length === 0 ? <EmptyState message="No hay documentos adjuntos." /> : (
        <TableWrap>
          <Table caption="Documentos del empleado"><THead><Th>Tipo</Th><Th>Nombre</Th><Th>Fecha de carga</Th><Th>Responsable</Th><Th>Vence</Th><Th className="text-right">Acciones</Th></THead>
            <tbody>{records.map((d) => (
              <Tr key={d.id}>
                <Td>{DOCUMENT_TYPE_LABEL[d.type]}</Td><Td className="font-medium text-slate-900">{d.fileName} <span className="font-normal text-slate-500">({formatBytes(d.size)})</span></Td>
                <Td className="tnum">{formatDateTime(d.uploadedAt)}</Td><Td>{d.uploadedBy}</Td><Td className="tnum">{formatDate(d.expiresOn)}</Td>
                <Td className="text-right"><div className="flex justify-end gap-1">
                  <Button variant="ghost" className="h-8 px-2" icon="download" onClick={() => toast.info("La descarga estará disponible cuando el backend almacene los documentos.")}>Descargar</Button>
                  {canEdit && <Button variant="ghost" className="h-8 px-2" icon="sync" onClick={() => { replaceTarget.current = d.id; replaceInput.current?.click(); }}>Reemplazar</Button>}
                  {canEdit && <Button variant="ghost" className="h-8 px-2 text-red-600" icon="delete" onClick={() => setRemoving(d)}>Eliminar</Button>}
                </div></Td>
              </Tr>))}</tbody>
          </Table>
        </TableWrap>
      )}
      <AddDocumentModal open={adding} employeeId={employeeId} onClose={() => setAdding(false)} />
      <ConfirmDialog open={!!removing} title="Eliminar documento" message={`¿Desea eliminar "${removing?.fileName}"? Se quitará de la lista activa y la acción quedará registrada.`} confirmLabel="Eliminar" tone="danger" onCancel={() => setRemoving(null)} onConfirm={remove} />
    </div>
  );
}

function AddDocumentModal({ open, employeeId, onClose }: { open: boolean; employeeId: string; onClose: () => void }) {
  const toast = useToast();
  const [type, setType] = useState<DocumentType | "">("");
  const [expiresOn, setExpiresOn] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) { setWasOpen(open); if (open) { setType(""); setExpiresOn(""); setFile(null); setErrors({}); setFileError(undefined); setGeneral(null); } }
  const needsExpiry = type !== "" && DOCUMENT_TYPES_WITH_EXPIRY.includes(type);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const local = validateDocument({ type, hasFile: !!file, expiresOn });
    setErrors(local);
    if (Object.keys(local).length || !file) return;
    const res = await services.employees.addDocument(employeeId, { type, fileName: file.name, size: file.size, expiresOn: needsExpiry ? expiresOn : undefined });
    if (!res.ok) return setGeneral(res.error.message);
    toast.success("Documento adjuntado correctamente.");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" title="Adjuntar documento"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="doc-form" icon="upload_file">Adjuntar</Button></>}>
      <form id="doc-form" onSubmit={submit} noValidate className="space-y-4">
        {general && <Alert tone="danger">{general}</Alert>}
        <FormField id="doc-type" label="Tipo de documento" required error={errors.type}><Select id="doc-type" value={type} onChange={(e) => setType(e.target.value as DocumentType)} invalid={!!errors.type}><option value="">Seleccione…</option>{(Object.keys(DOCUMENT_TYPE_LABEL) as DocumentType[]).map((k) => <option key={k} value={k}>{DOCUMENT_TYPE_LABEL[k]}</option>)}</Select></FormField>
        {needsExpiry && <FormField id="doc-exp" label="Fecha de vencimiento" required error={errors.expiresOn} hint="Se considera en recordatorios y calendario."><Input id="doc-exp" type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} invalid={!!errors.expiresOn} /></FormField>}
        <div><p className="mb-1 text-[13px] font-medium text-slate-700">Archivo <span className="text-red-600">*</span></p><FileInput file={file} onChange={setFile} error={errors.file ?? fileError} onError={setFileError} /></div>
      </form>
    </Modal>
  );
}
