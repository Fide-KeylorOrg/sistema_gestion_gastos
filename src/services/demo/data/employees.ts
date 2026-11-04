import type { DisabilityRecord, Employee, EmployeeDocument, SalaryAdvance, VacationRecord, WorkHistoryEntry } from "@/features/employees/types";

const E = (id: string, first: string, l1: string, l2: string, idNumber: string, position: string, hire: string, salary: number, extra: Partial<Employee> = {}): Employee => ({
  id, idType: "NATIONAL_ID", idNumber, firstName: first, lastName1: l1, lastName2: l2, birthDate: "1990-05-14", email: `${first.split(" ")[0].toLowerCase()}.${l1.toLowerCase()}@correo.cr`,
  phone: "8800-" + id.slice(-1).repeat(4), address: "Heredia, San Francisco", position, hireDate: hire, active: true, salaryBasis: "MONTHLY", baseSalary: salary,
  vacationBalanceDays: 8, workday: "Diurna (48 h semanales)", salaryEffectiveFrom: hire, ...extra,
});

export const demoEmployees = (): Employee[] => [
  E("emp-1", "Carlos", "Mora", "Jiménez", "1-1234-0567", "Carnicero", "2021-03-01", 650000, { vacationBalanceDays: 12, contractEndsOn: "2026-12-15", birthDate: "1985-02-11" }),
  E("emp-2", "María Fernanda", "Solís", "Vargas", "2-0654-0321", "Cajera", "2022-06-15", 520000, { vacationBalanceDays: 6 }),
  E("emp-3", "José Pablo", "Rojas", "Araya", "1-1450-0782", "Encargado de ferretería", "2020-01-10", 700000, { vacationBalanceDays: 15, contractEndsOn: "2027-01-31" }),
  E("emp-4", "Andrea", "Cascante", "Núñez", "4-0215-0933", "Cajera", "2023-09-04", 520000, { vacationBalanceDays: 4 }),
  E("emp-5", "Luis Fernando", "Calderón", "Sáenz", "1-0987-0451", "Reposición y displays", "2024-02-19", 2800, { salaryBasis: "HOURLY", vacationBalanceDays: 5, workday: "Mixta (44 h semanales)" }),
  E("emp-6", "Jimena", "Ulate", "Quesada", "3-0412-0678", "Ayudante de carnicería", "2025-04-07", 560000, { vacationBalanceDays: 3, address: undefined }),
  E("emp-7", "Esteban", "Brenes", "Mora", "1-1620-0144", "Cajero", "2025-11-03", 520000, { vacationBalanceDays: 2 }),
  E("emp-8", "Patricia", "Mora", "Calvo", "1-1420-0382", "Asistente administrativa", "2019-08-12", 800000, { active: false, statusChangedAt: "2026-10-10", statusReason: "Renuncia", vacationBalanceDays: 0 }),
  E("emp-9", "Rodolfo", "Chaves", "Segura", "5-0233-0890", "Auxiliar de ferretería", "2022-10-17", 540000, { active: false, statusChangedAt: "2026-08-20", statusReason: "Despido sin responsabilidad patronal", vacationBalanceDays: 0 }),
];

const H = (id: number, employeeId: string, date: string, type: WorkHistoryEntry["type"], detail: string, amount?: number): WorkHistoryEntry => ({
  id: `wh-${id}`, employeeId, date, type, detail, actorName: "Damaris Salas", amount,
});

export const demoWorkHistory = (): WorkHistoryEntry[] => [
  H(1, "emp-1", "2021-03-01", "INGRESO", "Ingreso como Carnicero.", 520000),
  H(2, "emp-1", "2023-03-01", "CAMBIO_SALARIAL", "Ajuste salarial anual.", 600000),
  H(3, "emp-1", "2025-03-01", "CAMBIO_SALARIAL", "Ajuste salarial anual.", 650000),
  H(4, "emp-1", "2026-07-06", "VACACIONES", "Vacaciones del 06/07/2026 al 10/07/2026 (5 días)."),
  H(5, "emp-1", "2026-09-14", "INCAPACIDAD", "Incapacidad por enfermedad (CCSS) del 14/09/2026 al 16/09/2026."),
  H(6, "emp-2", "2022-06-15", "INGRESO", "Ingreso como Cajera.", 480000),
  H(7, "emp-2", "2025-01-01", "CAMBIO_SALARIAL", "Ajuste salarial.", 520000),
  H(8, "emp-8", "2019-08-12", "INGRESO", "Ingreso como Asistente administrativa.", 600000),
  H(9, "emp-8", "2026-10-10", "SALIDA", "Renuncia. Fecha de salida 10/10/2026."),
  H(10, "emp-9", "2022-10-17", "INGRESO", "Ingreso como Auxiliar de ferretería.", 480000),
  H(11, "emp-9", "2026-08-20", "SALIDA", "Despido sin responsabilidad patronal. Fecha de salida 20/08/2026."),
  H(12, "emp-3", "2020-01-10", "INGRESO", "Ingreso como Encargado de ferretería.", 560000),
  H(13, "emp-7", "2025-11-03", "INGRESO", "Ingreso como Cajero.", 520000),
];

export const demoVacations = (): VacationRecord[] => [
  { id: "vac-1", employeeId: "emp-1", start: "2026-07-06", end: "2026-07-10", days: 5, cancelled: false, payrollClosed: true },
  { id: "vac-2", employeeId: "emp-3", start: "2026-11-23", end: "2026-11-27", days: 5, cancelled: false, payrollClosed: false },
  { id: "vac-3", employeeId: "emp-2", start: "2026-11-09", end: "2026-11-10", days: 2, cancelled: false, payrollClosed: false },
  { id: "vac-4", employeeId: "emp-4", start: "2026-10-19", end: "2026-10-21", days: 3, cancelled: false, payrollClosed: false },
];

export const demoDisabilities = (): DisabilityRecord[] => [
  { id: "inc-1", employeeId: "emp-1", start: "2026-09-14", end: "2026-09-16", type: "ENFERMEDAD_CCSS", receipt: { name: "incapacidad-ccss-sep.pdf", size: 98304, uploadedAt: "2026-09-17T10:00:00-06:00" }, cancelled: false, payrollClosed: true },
  { id: "inc-2", employeeId: "emp-6", start: "2026-11-02", end: "2026-11-06", type: "RIESGO_TRABAJO_INS", cancelled: false, payrollClosed: false },
];

export const demoDocuments = (): EmployeeDocument[] => [
  { id: "doc-1", employeeId: "emp-1", type: "CEDULA", fileName: "cedula-carlos-mora.pdf", size: 210000, uploadedAt: "2026-09-26T10:00:00-06:00", uploadedBy: "Damaris Salas" },
  { id: "doc-2", employeeId: "emp-1", type: "CONTRATO", fileName: "contrato-2026.pdf", size: 530000, uploadedAt: "2026-09-26T10:05:00-06:00", uploadedBy: "Damaris Salas", expiresOn: "2026-12-15" },
  { id: "doc-3", employeeId: "emp-1", type: "COMPROBANTE_INCAPACIDAD", fileName: "incapacidad-ccss-sep.pdf", size: 98304, uploadedAt: "2026-09-17T10:00:00-06:00", uploadedBy: "Damaris Salas" },
  { id: "doc-4", employeeId: "emp-3", type: "CONTRATO", fileName: "contrato-jp-rojas.pdf", size: 480000, uploadedAt: "2026-09-27T09:00:00-06:00", uploadedBy: "Damaris Salas", expiresOn: "2027-01-31" },
];

export const demoAdvances = (): SalaryAdvance[] => [
  { id: "adv-1", employeeId: "emp-1", amount: 80000, date: "2026-10-05", discountPeriodId: "pay-5", discountPeriodLabel: "01/10/2026 – 15/10/2026", note: "Gastos médicos.", status: "DESCONTADO", lockedByClosedPayroll: true },
  { id: "adv-2", employeeId: "emp-1", amount: 50000, date: "2026-10-22", discountPeriodId: "pay-6", discountPeriodLabel: "16/10/2026 – 31/10/2026", status: "PENDIENTE", lockedByClosedPayroll: false },
  { id: "adv-3", employeeId: "emp-2", amount: 40000, date: "2026-10-24", discountPeriodId: "pay-6", discountPeriodLabel: "16/10/2026 – 31/10/2026", status: "PENDIENTE", lockedByClosedPayroll: false },
];
