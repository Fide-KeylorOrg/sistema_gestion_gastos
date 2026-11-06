"use client";

import { useState } from "react";
import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import { formatDate } from "@/lib/format";
import type { FieldErrors } from "@/lib/result";
import { Alert, Button, Card, DemoNotice, EmptyState, ErrorState, FormField, Input, Loading, Modal, PageHeader, Tabs, Textarea, useToast } from "@/components/ui";
import { useSession } from "@/features/access/demo-session";
import { SalaryAmount } from "@/features/access/salary-amount";
import { DEMO_TODAY } from "@/services/demo/clock";
import { EmployeeStatusBadge } from "./employee-parts";
import { HistoryTab } from "./history-tab";
import { VacationsTab, DisabilitiesTab } from "./absences-tabs";
import { DocumentsTab } from "./documents-tab";
import { AdvancesTab } from "./advances-tab";
import { fullName, ID_TYPE_LABEL, SALARY_BASIS_LABEL } from "../types";
import { validateStatusChange } from "../validation";

type TabId = "datos" | "historial" | "vacaciones" | "incapacidades" | "documentos" | "adelantos";

export function EmployeeRecordView({ id }: { id: string }) {
  const q = useQuery(["employee", id], () => services.employees.getRecord(id));
  const { can } = useSession();
  const [tab, setTab] = useState<TabId>("datos");
  const [statusModal, setStatusModal] = useState<"off" | "on" | null>(null);

  if (q.loading) return <Loading />;
  if (q.error) return <ErrorState message={q.error} />;
  if (!q.data) return <><PageHeader title="Empleado no encontrado" backHref="/empleados" backLabel="Volver a empleados" /><EmptyState message="El expediente solicitado no existe." /></>;
  const { employee: e, documents, vacations, disabilities, advances } = q.data;
  const canEdit = can("planilla.editar");

  return (
    <>
      <PageHeader
        title={fullName(e)}
        subtitle={<span className="inline-flex flex-wrap items-center gap-2">{e.position} · {ID_TYPE_LABEL[e.idType]} {e.idNumber} · <EmployeeStatusBadge active={e.active} /></span>}
        backHref="/empleados"
        backLabel="Volver a empleados"
        actions={
          <>
            {can("planilla.infoSalarial") && <Button variant="secondary" icon="payments" href={`/empleados/${id}/salarial`}>Detalle salarial</Button>}
            {canEdit && <Button variant="secondary" icon="edit" href={`/empleados/${id}/editar`}>Editar</Button>}
            {canEdit && (e.active ? <Button variant="danger" icon="person_off" onClick={() => setStatusModal("off")}>Inactivar</Button> : <Button icon="person_check" onClick={() => setStatusModal("on")}>Reactivar</Button>)}
          </>
        }
      />
      <div className="mb-4 space-y-3">
        <DemoNotice />
        {!can("planilla.infoSalarial") && <Alert tone="warning" title="Información salarial restringida">No tiene permiso para consultar salario, deducciones ni montos de adelantos. El expediente se muestra sin esa información.</Alert>}
      </div>

      <Tabs<TabId> label="Secciones del expediente" value={tab} onChange={setTab} tabs={[
        { id: "datos", label: "Datos" }, { id: "historial", label: "Historial laboral" }, { id: "vacaciones", label: "Vacaciones", badge: vacations.filter((v) => !v.cancelled).length },
        { id: "incapacidades", label: "Incapacidades", badge: disabilities.filter((v) => !v.cancelled).length }, { id: "documentos", label: "Documentos", badge: documents.length }, { id: "adelantos", label: "Adelantos" },
      ]} />
      <div className="mt-6">
        {tab === "datos" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Datos personales">
              <dl className="space-y-3 text-sm">
                <Row l="Nombre completo" v={fullName(e)} /><Row l="Identificación" v={`${ID_TYPE_LABEL[e.idType]} ${e.idNumber}`} /><Row l="Fecha de nacimiento" v={formatDate(e.birthDate)} />
                <Row l="Correo electrónico" v={e.email ?? "—"} /><Row l="Teléfono" v={e.phone ?? "—"} /><Row l="Dirección" v={e.address ?? "—"} />
              </dl>
            </Card>
            <Card title="Datos laborales">
              <dl className="space-y-3 text-sm">
                <Row l="Puesto" v={e.position} /><Row l="Fecha de ingreso" v={formatDate(e.hireDate)} />
                <Row l="Estado" v={<>{e.active ? "Activo" : "Inactivo"}{e.statusChangedAt && <span className="text-slate-500"> (desde {formatDate(e.statusChangedAt)}{e.statusReason ? ` · ${e.statusReason}` : ""})</span>}</>} />
                <Row l="Saldo de vacaciones" v={`${e.vacationBalanceDays} días`} />
                <Row l="Vencimiento del contrato" v={formatDate(e.contractEndsOn)} />
                <Row l="Tipo de salario" v={<SalaryText text={SALARY_BASIS_LABEL[e.salaryBasis]} />} />
                <Row l="Salario base" v={<SalaryAmount value={e.baseSalary} />} />
              </dl>
            </Card>
          </div>
        )}
        {tab === "historial" && <HistoryTab employeeId={id} />}
        {tab === "vacaciones" && <VacationsTab employee={e} records={vacations} canEdit={canEdit} />}
        {tab === "incapacidades" && <DisabilitiesTab employee={e} records={disabilities} canEdit={canEdit} />}
        {tab === "documentos" && <DocumentsTab employeeId={id} records={documents} canEdit={canEdit} />}
        {tab === "adelantos" && <AdvancesTab employee={e} records={advances} canEdit={canEdit} />}
      </div>

      <StatusModal mode={statusModal} employeeId={id} hireDate={e.hireDate} onClose={() => setStatusModal(null)} />
    </>
  );
}

const Row = ({ l, v }: { l: string; v: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between"><dt className="text-slate-500">{l}</dt><dd className="font-medium text-slate-900 sm:text-right">{v}</dd></div>
);
function SalaryText({ text }: { text: string }) {
  const { can } = useSession();
  return can("planilla.infoSalarial") ? <>{text}</> : <span className="text-xs text-slate-500">Restringido</span>;
}

/** HU-29: inactivar (fecha y motivo, con confirmación) y reactivar (fecha de reingreso). */
function StatusModal({ mode, employeeId, hireDate, onClose }: { mode: "off" | "on" | null; employeeId: string; hireDate: string; onClose: () => void }) {
  const toast = useToast();
  const [v, setV] = useState({ date: DEMO_TODAY, reason: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirm, setConfirm] = useState(false);
  const [general, setGeneral] = useState<string | null>(null);
  const [key, setKey] = useState<string | null>(null);
  if (mode !== key) { setKey(mode); if (mode) { setV({ date: DEMO_TODAY, reason: "" }); setErrors({}); setConfirm(false); setGeneral(null); } }
  const off = mode === "off";

  function next(e: React.FormEvent) {
    e.preventDefault();
    const local = validateStatusChange(v, { needsReason: off, hireDate, today: DEMO_TODAY });
    setErrors(local);
    if (Object.keys(local).length) return;
    setConfirm(true);
  }
  async function apply() {
    const res = off ? await services.employees.deactivate(employeeId, { date: v.date, reason: v.reason }) : await services.employees.reactivate(employeeId, { date: v.date });
    if (!res.ok) { setConfirm(false); setErrors(res.error.fieldErrors ?? {}); return setGeneral(res.error.message); }
    toast.success(off ? "Empleado inactivado correctamente." : "Empleado reactivado correctamente.");
    onClose();
  }

  return (
    <Modal open={!!mode} onClose={onClose} size="sm" title={off ? "Inactivar empleado" : "Reactivar empleado"}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button>{confirm ? <Button variant={off ? "danger" : "primary"} onClick={apply}>Confirmar</Button> : <Button type="submit" form="status-form">Continuar</Button>}</>}>
      {confirm ? (
        <p className="text-sm text-slate-600">{off ? <>Se conservarán todos los datos del expediente. El empleado quedará excluido de las planillas de períodos posteriores a la fecha de salida ({formatDate(v.date)}).</> : <>Se conservará el historial anterior y se registrará el reingreso el {formatDate(v.date)}. Los conteos del dashboard se actualizarán.</>}</p>
      ) : (
        <form id="status-form" onSubmit={next} noValidate className="space-y-4">
          {general && <Alert tone="danger">{general}</Alert>}
          <FormField id="st-date" label={off ? "Fecha de salida" : "Fecha de reingreso"} required error={errors.date}><Input id="st-date" type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} invalid={!!errors.date} /></FormField>
          {off && <FormField id="st-reason" label="Motivo" required error={errors.reason}><Textarea id="st-reason" value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })} invalid={!!errors.reason} placeholder="Renuncia, despido…" /></FormField>}
        </form>
      )}
    </Modal>
  );
}
