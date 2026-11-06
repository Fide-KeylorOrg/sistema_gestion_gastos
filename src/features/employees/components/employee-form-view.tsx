"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import type { FieldErrors } from "@/lib/result";
import { Alert, Button, Card, DemoNotice, ErrorState, FormField, Input, Loading, PageHeader, Select, Textarea, useToast } from "@/components/ui";
import { DEMO_TODAY } from "@/services/demo/clock";
import { ID_TYPE_LABEL, SALARY_BASIS_LABEL, type IdType, type SalaryBasis } from "../types";
import { parseEmployeeForm, type EmployeeFormValues } from "../validation";

const BLANK: EmployeeFormValues = { idType: "NATIONAL_ID", idNumber: "", firstName: "", lastName1: "", lastName2: "", birthDate: "", email: "", phone: "", address: "", position: "", hireDate: "", salaryBasis: "MONTHLY", baseSalary: "", contractEndsOn: "" };

/** Registrar (HU-25) y editar (HU-28). Con `employeeId` es edición. */
export function EmployeeFormView({ employeeId }: { employeeId?: string }) {
  const rec = useQuery(["employee-form", employeeId], () => (employeeId ? services.employees.getRecord(employeeId) : Promise.resolve(null)));
  if (employeeId && rec.loading) return <Loading />;
  if (rec.error) return <ErrorState message={rec.error} />;
  if (employeeId && !rec.data) return <Alert tone="danger" title="El empleado no existe" />;
  const e = rec.data?.employee;
  const initial: EmployeeFormValues = e
    ? { idType: e.idType, idNumber: e.idNumber, firstName: e.firstName, lastName1: e.lastName1, lastName2: e.lastName2 ?? "", birthDate: e.birthDate, email: e.email ?? "", phone: e.phone ?? "", address: e.address ?? "", position: e.position, hireDate: e.hireDate, salaryBasis: e.salaryBasis, baseSalary: String(e.baseSalary), contractEndsOn: e.contractEndsOn ?? "" }
    : BLANK;
  return <Form key={employeeId ?? "new"} initial={initial} employeeId={employeeId} />;
}

function Form({ initial, employeeId }: { initial: EmployeeFormValues; employeeId?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const back = employeeId ? `/empleados/${employeeId}` : "/empleados";
  const set = (k: keyof EmployeeFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setGeneral(null);
    const parsed = parseEmployeeForm(v, DEMO_TODAY);
    setErrors(parsed.errors);
    if (!parsed.input) return;
    setBusy(true);
    const res = employeeId ? await services.employees.update(employeeId, parsed.input) : await services.employees.create(parsed.input);
    setBusy(false);
    if (!res.ok) { setErrors(res.error.fieldErrors ?? {}); return setGeneral(res.error.message); }
    toast.success(employeeId ? "Empleado actualizado correctamente." : "Empleado registrado correctamente.");
    router.push(`/empleados/${res.data.id}`);
  }

  return (
    <>
      <PageHeader title={employeeId ? "Editar empleado" : "Registrar empleado"} subtitle="Los campos marcados con * son obligatorios." backHref={back} backLabel="Volver" />
      <div className="mb-4"><DemoNotice /></div>
      <form onSubmit={submit} noValidate className="max-w-4xl space-y-6">
        {general && <Alert tone="danger">{general}</Alert>}
        <Card title="Datos personales">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="m-idType" label="Tipo de identificación" required error={errors.idType}>
              <Select id="m-idType" value={v.idType} onChange={(e) => setV({ ...v, idType: e.target.value as IdType })} invalid={!!errors.idType}><option value="">Seleccione…</option>{(Object.keys(ID_TYPE_LABEL) as IdType[]).map((k) => <option key={k} value={k}>{ID_TYPE_LABEL[k]}</option>)}</Select>
            </FormField>
            <FormField id="m-idNumber" label="Número de identificación" required error={errors.idNumber}><Input id="m-idNumber" value={v.idNumber} onChange={set("idNumber")} invalid={!!errors.idNumber} placeholder="1-2345-6789" /></FormField>
            <FormField id="m-first" label="Nombre" required error={errors.firstName}><Input id="m-first" value={v.firstName} onChange={set("firstName")} invalid={!!errors.firstName} /></FormField>
            <FormField id="m-l1" label="Primer apellido" required error={errors.lastName1}><Input id="m-l1" value={v.lastName1} onChange={set("lastName1")} invalid={!!errors.lastName1} /></FormField>
            <FormField id="m-l2" label="Segundo apellido"><Input id="m-l2" value={v.lastName2} onChange={set("lastName2")} /></FormField>
            <FormField id="m-birth" label="Fecha de nacimiento" required error={errors.birthDate}><Input id="m-birth" type="date" value={v.birthDate} onChange={set("birthDate")} invalid={!!errors.birthDate} /></FormField>
            <FormField id="m-email" label="Correo electrónico" error={errors.email}><Input id="m-email" type="email" value={v.email} onChange={set("email")} invalid={!!errors.email} /></FormField>
            <FormField id="m-phone" label="Teléfono"><Input id="m-phone" value={v.phone} onChange={set("phone")} /></FormField>
            <FormField id="m-address" label="Dirección" className="sm:col-span-2"><Textarea id="m-address" value={v.address} onChange={set("address")} /></FormField>
          </div>
        </Card>
        <Card title="Datos laborales">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="m-pos" label="Puesto" required error={errors.position}><Input id="m-pos" value={v.position} onChange={set("position")} invalid={!!errors.position} /></FormField>
            <FormField id="m-hire" label="Fecha de ingreso" required error={errors.hireDate}><Input id="m-hire" type="date" value={v.hireDate} onChange={set("hireDate")} invalid={!!errors.hireDate} /></FormField>
            <FormField id="m-basis" label="Tipo de salario" required error={errors.salaryBasis}>
              <Select id="m-basis" value={v.salaryBasis} onChange={(e) => setV({ ...v, salaryBasis: e.target.value as SalaryBasis })} invalid={!!errors.salaryBasis}><option value="">Seleccione…</option>{(Object.keys(SALARY_BASIS_LABEL) as SalaryBasis[]).map((k) => <option key={k} value={k}>{SALARY_BASIS_LABEL[k]}</option>)}</Select>
            </FormField>
            <FormField id="m-salary" label="Salario base (₡)" required error={errors.baseSalary}><Input id="m-salary" inputMode="decimal" value={v.baseSalary} onChange={set("baseSalary")} invalid={!!errors.baseSalary} /></FormField>
            <FormField id="m-contract" label="Vencimiento del contrato (opcional)" error={errors.contractEndsOn} hint="Se muestra en el calendario."><Input id="m-contract" type="date" value={v.contractEndsOn} onChange={set("contractEndsOn")} invalid={!!errors.contractEndsOn} /></FormField>
          </div>
        </Card>
        <div className="flex justify-end gap-2"><Button variant="secondary" href={back}>Cancelar</Button><Button type="submit" icon="save" disabled={busy}>{employeeId ? "Guardar cambios" : "Guardar"}</Button></div>
      </form>
    </>
  );
}
