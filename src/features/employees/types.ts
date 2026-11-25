import type { ISODate } from "@/lib/format";
import type { Attachment } from "@/features/expenses/types";

export type IdType = "NATIONAL_ID" | "DIMEX" | "PASSPORT";
export const ID_TYPE_LABEL: Record<IdType, string> = { NATIONAL_ID: "Cédula de identidad", DIMEX: "DIMEX", PASSPORT: "Pasaporte" };

export type SalaryBasis = "MONTHLY" | "HOURLY";
export const SALARY_BASIS_LABEL: Record<SalaryBasis, string> = { MONTHLY: "Mensual", HOURLY: "Por hora" };

/** Campos del modelo Employee de Prisma, más campos que solo existen en la interfaz (marcados). */
export type Employee = {
  id: string;
  idType: IdType;
  idNumber: string;
  firstName: string;
  lastName1: string;
  lastName2?: string;
  birthDate: ISODate;
  email?: string;
  phone?: string;
  address?: string;
  position: string;
  hireDate: ISODate;
  active: boolean;
  statusChangedAt?: ISODate;
  statusReason?: string;
  /** Salario vigente hoy: el servicio lo toma de EmployeeSalary (salaryOn), no se guarda en el empleado. */
  salaryBasis: SalaryBasis;
  baseSalary: number;
  /** Vencimiento del contrato (HU-48). */
  contractEndsOn?: ISODate;
  /** SOLO INTERFAZ: el saldo de vacaciones lo calcula el backend (HU-17, 27). */
  vacationBalanceDays: number;
  /** Desde cuándo rige el salario vigente (HU-18). */
  salaryEffectiveFrom: ISODate;
};

/** Igual que el modelo Employee de Prisma: el salario vive aparte, en EmployeeSalary. */
export type EmployeeEntity = Omit<Employee, "salaryBasis" | "baseSalary" | "salaryEffectiveFrom">;

/** Igual que el modelo EmployeeSalary de Prisma: cada fila rige desde effectiveFrom hasta que empieza la siguiente. */
export type EmployeeSalary = { id: string; employeeId: string; salaryBasis: SalaryBasis; baseSalary: number; effectiveFrom: ISODate };

/** Salario que rige en `date`: la fila más reciente con effectiveFrom <= date (HU-18). */
export const salaryOn = (salaries: EmployeeSalary[], employeeId: string, date: ISODate): EmployeeSalary | undefined =>
  salaries.filter((s) => s.employeeId === employeeId && s.effectiveFrom <= date).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];

export const fullName = (e: Pick<Employee, "firstName" | "lastName1" | "lastName2">) =>
  [e.firstName, e.lastName1, e.lastName2].filter(Boolean).join(" ");

export type EmployeeFilters = { search?: string; active?: "all" | "active" | "inactive"; position?: string };

export type EmployeeInput = Omit<Employee, "id" | "active" | "statusChangedAt" | "statusReason" | "vacationBalanceDays" | "salaryEffectiveFrom">;

export type WorkHistoryType = "INGRESO" | "CAMBIO_SALARIAL" | "VACACIONES" | "INCAPACIDAD" | "SALIDA" | "REINGRESO" | "EDICION";
export const WORK_HISTORY_LABEL: Record<WorkHistoryType, string> = {
  INGRESO: "Ingreso",
  CAMBIO_SALARIAL: "Cambio salarial",
  VACACIONES: "Vacaciones",
  INCAPACIDAD: "Incapacidad",
  SALIDA: "Salida (renuncia o despido)",
  REINGRESO: "Reingreso",
  EDICION: "Edición de datos",
};
export type WorkHistoryEntry = {
  id: string;
  employeeId: string;
  date: ISODate;
  type: WorkHistoryType;
  detail: string;
  actorName: string;
  /** Solo visible con permiso de información salarial. */
  amount?: number;
};
export type WorkHistoryFilters = { type?: WorkHistoryType | ""; from?: ISODate; to?: ISODate };

export type VacationRecord = { id: string; employeeId: string; start: ISODate; end: ISODate; days: number; cancelled: boolean; payrollClosed: boolean };
export type VacationInput = { start: ISODate; end: ISODate };

/** PENDIENTE: el catálogo de tipos de incapacidad debe confirmarlo la administración. */
export type DisabilityType = "ENFERMEDAD_CCSS" | "RIESGO_TRABAJO_INS" | "OTRA";
export const DISABILITY_TYPE_LABEL: Record<DisabilityType, string> = {
  ENFERMEDAD_CCSS: "Enfermedad (CCSS)",
  RIESGO_TRABAJO_INS: "Riesgo del trabajo (INS)",
  OTRA: "Otra",
};
export type DisabilityRecord = { id: string; employeeId: string; start: ISODate; end: ISODate; type: DisabilityType; receipt?: Attachment; cancelled: boolean; payrollClosed: boolean };
export type DisabilityInput = { start: ISODate; end: ISODate; type: DisabilityType | ""; receipt?: Attachment };

export type DocumentType = "CEDULA" | "CONTRATO" | "HOJA_DELINCUENCIA" | "CARTA_RECOMENDACION" | "COMPROBANTE_INCAPACIDAD" | "OTRO";
export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  CEDULA: "Cédula",
  CONTRATO: "Contrato",
  HOJA_DELINCUENCIA: "Hoja de delincuencia",
  CARTA_RECOMENDACION: "Carta de recomendación",
  COMPROBANTE_INCAPACIDAD: "Comprobante de incapacidad",
  OTRO: "Otro",
};
/** Tipos que llevan fecha de vencimiento (HU-33 escenario 3). PENDIENTE: confirmar cuáles con la administración. */
export const DOCUMENT_TYPES_WITH_EXPIRY: DocumentType[] = ["CONTRATO"];

export type EmployeeDocument = {
  id: string;
  employeeId: string;
  type: DocumentType;
  fileName: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  expiresOn?: ISODate;
};
export type DocumentInput = { type: DocumentType | ""; fileName: string; size: number; expiresOn?: ISODate };

export type AdvanceStatus = "PENDIENTE" | "DESCONTADO" | "ANULADO";
export type SalaryAdvance = {
  id: string;
  employeeId: string;
  amount: number;
  date: ISODate;
  discountPeriodId: string;
  discountPeriodLabel: string;
  note?: string;
  status: AdvanceStatus;
  /** Descontado en una planilla cerrada: no se puede modificar ni anular (HU-35 escenario 3). */
  lockedByClosedPayroll: boolean;
};
export type AdvanceInput = { amount: number; date: ISODate; discountPeriodId: string; note?: string };

/** Datos agregados del expediente (HU-27). Los campos salariales llegan vacíos si no hay permiso. */
export type EmployeeRecord = {
  employee: Employee;
  documents: EmployeeDocument[];
  vacations: VacationRecord[];
  disabilities: DisabilityRecord[];
  advances: SalaryAdvance[];
};

export type StatusChangeInput = { date: ISODate; reason?: string };
export type SalaryDataInput = { salaryBasis: SalaryBasis; baseSalary: number; effectiveFrom: ISODate };
