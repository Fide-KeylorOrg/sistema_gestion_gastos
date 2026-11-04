"use client";

import Link from "next/link";
import { useState } from "react";
import { services } from "@/services";
import { useQuery } from "@/lib/use-query";
import { usePagination } from "@/lib/use-pagination";
import { Button, Card, DemoNotice, EmptyState, ErrorState, FormField, Input, Loading, PageHeader, Pagination, Select, Table, TableWrap, Td, Th, THead, Tr } from "@/components/ui";
import { useSession } from "@/features/access/demo-session";
import { SalaryAmount } from "@/features/access/salary-amount";
import { EmployeeStatusBadge } from "./employee-parts";
import { fullName, type EmployeeFilters } from "../types";

export function EmployeesListView({ initialActive = "all" }: { initialActive?: EmployeeFilters["active"] }) {
  const [f, setF] = useState<EmployeeFilters>({ search: "", active: initialActive, position: "" });
  const { can } = useSession();
  const rows = useQuery(["employees", f], () => services.employees.list(f));
  const positions = useQuery(["positions"], () => services.employees.positions());
  const pager = usePagination(rows.data ?? [], 8);
  const showSalary = can("planilla.infoSalarial");
  const clear = () => setF({ search: "", active: "all", position: "" });

  return (
    <>
      <PageHeader title="Empleados" subtitle="Expediente digital de cada colaborador." actions={can("planilla.crear") && <Button href="/empleados/nuevo" icon="person_add">Registrar empleado</Button>} />
      <div className="mb-4"><DemoNotice /></div>
      <Card padded={false}>
        <form className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[1fr_180px_220px_auto]" role="search" onSubmit={(e) => e.preventDefault()}>
          <FormField id="em-search" label="Nombre o identificación"><Input id="em-search" value={f.search} onChange={(e) => setF({ ...f, search: e.target.value })} /></FormField>
          <FormField id="em-status" label="Estado">
            <Select id="em-status" value={f.active} onChange={(e) => setF({ ...f, active: e.target.value as EmployeeFilters["active"] })}><option value="all">Todos</option><option value="active">Activo</option><option value="inactive">Inactivo</option></Select>
          </FormField>
          <FormField id="em-pos" label="Puesto">
            <Select id="em-pos" value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })}><option value="">Todos</option>{positions.data?.map((p) => <option key={p}>{p}</option>)}</Select>
          </FormField>
          <div className="flex items-end"><Button variant="secondary" icon="filter_alt_off" onClick={clear}>Limpiar filtros</Button></div>
        </form>
        <div className="p-4">
          {rows.loading ? <Loading /> : rows.error ? <ErrorState message={rows.error} /> : pager.total === 0 ? (
            <EmptyState message="No se encontraron empleados con los criterios indicados." action={<Button variant="secondary" onClick={clear}>Limpiar filtros</Button>} />
          ) : (
            <>
              <TableWrap>
                <Table caption="Empleados">
                  <THead><Th>Identificación</Th><Th>Nombre completo</Th><Th>Puesto</Th>{showSalary && <Th numeric>Salario base</Th>}<Th>Estado</Th><Th className="text-right">Acciones</Th></THead>
                  <tbody>
                    {pager.pageItems.map((e) => (
                      <Tr key={e.id}>
                        <Td className="tnum">{e.idNumber}</Td>
                        <Td className="font-medium text-slate-900">{fullName(e)}</Td>
                        <Td>{e.position}</Td>
                        {showSalary && <Td numeric><SalaryAmount value={e.baseSalary} /></Td>}
                        <Td><EmployeeStatusBadge active={e.active} /></Td>
                        <Td className="text-right"><Link href={`/empleados/${e.id}`} className="font-medium text-blue-700 hover:underline">Ver expediente</Link></Td>
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
    </>
  );
}
