/**
 * CONTRATOS DE SERVICIO (capa de acceso a datos del frontend).
 *
 * Las pantallas SOLO hablan con estas interfaces (ver `services/index.ts`). Hoy las implementa
 * `services/demo/*` con datos en memoria. Para conectar el backend se crea una implementación que haga
 * `fetch` a los endpoints propuestos en docs/FRONTEND.md y se cambia la exportación en `services/index.ts`;
 * las pantallas no cambian. Cada mutación real debe llamar a `notifyDataChanged()` al terminar.
 *
 * Convención: las consultas devuelven datos o null; las mutaciones devuelven Result<T> (ver lib/result.ts).
 */
import type { ISODate } from "@/lib/format";
import type { Result } from "@/lib/result";
import type { PermissionKey } from "@/features/access/types";
import type {
  AuditEntry, AuditFilters, ChangePasswordInput, CreateUserInput, Role, RoleDetail, RoleSummary, User, UserDetail, UserFilters, UserInput,
} from "@/features/users/types";
import type {
  CategoryWithCount, DueDetail, DueFilters, DueRow, ExpenseCategory, ExpenseInput, NotificationSettings, PaymentInput,
} from "@/features/expenses/types";
import type {
  AdvanceInput, DisabilityInput, DocumentInput, Employee, EmployeeFilters, EmployeeInput, EmployeeRecord, SalaryAdvance, SalaryDataInput,
  StatusChangeInput, VacationInput, WorkHistoryEntry, WorkHistoryFilters,
} from "@/features/employees/types";
import type {
  CcssCheck, CreatePayrollInput, EmployeeSalaryView, GlobalRate, LiquidationInput, LiquidationResult, Novelty, NoveltyFilters, NoveltyInput,
  Payroll, PayrollDetail, PayrollFilters, PayrollSummary, Payslip, RateInput,
} from "@/features/payroll/types";
import type { CalendarEvent } from "@/features/calendar/types";
import type { ComparisonMode, DashboardSummary, ExpenseComparison, PayrollComparison, PeriodRef } from "@/features/dashboard/types";

export type UserRow = User & { roleName: string };

export interface UsersService {
  list(filters: UserFilters): Promise<UserRow[]>; // HU-4
  get(id: string): Promise<UserDetail | null>; // HU-5
  create(input: CreateUserInput): Promise<Result<User>>; // HU-3
  update(id: string, input: Omit<UserInput, "roleId">): Promise<Result<User>>; // HU-6
  setActive(id: string, active: boolean): Promise<Result>; // HU-7
  changeRole(id: string, roleId: string): Promise<Result>; // HU-8
  resetPassword(id: string): Promise<Result<{ temporaryPassword: string }>>; // HU-14 (el servidor genera la clave)
  changeOwnPassword(input: ChangePasswordInput): Promise<Result>; // HU-13
}

export interface RolesService {
  list(): Promise<RoleSummary[]>; // HU-10
  get(id: string): Promise<RoleDetail | null>; // HU-10
  create(input: { name: string; permissions: PermissionKey[] }): Promise<Result<Role>>; // HU-9
  update(id: string, input: { name: string; permissions: PermissionKey[] }): Promise<Result<Role>>; // HU-11
}

export interface AuditService {
  list(filters: AuditFilters): Promise<AuditEntry[]>; // HU-15 (solo lectura: no existe modificar ni borrar)
}

export interface ExpensesService {
  listDues(filters: DueFilters): Promise<DueRow[]>; // HU-38, 46, 47, 52
  getDue(dueId: string): Promise<DueDetail | null>; // HU-46 (detalle), 45 (historial)
  getExpense(expenseId: string): Promise<{ expense: ExpenseInput & { id: string }; dueId: string } | null>; // edición (HU-39)
  create(input: ExpenseInput): Promise<Result<{ dueId: string }>>; // HU-37, 40, 41, 42, 47, 51
  update(expenseId: string, input: ExpenseInput): Promise<Result<{ dueId: string }>>; // HU-39, 50 (tercer escenario)
  remove(expenseId: string): Promise<Result>; // HU-49
  markPaid(dueId: string, input: PaymentInput): Promise<Result<{ nextDueId?: string }>>; // HU-44, 51, 53
  revertPayment(dueId: string): Promise<Result>; // HU-45
  finalizeRecurrence(expenseId: string, endsOn: ISODate): Promise<Result>; // HU-54
  listCategories(): Promise<CategoryWithCount[]>; // HU-47, 48
  createCategory(input: { name: string; description?: string }): Promise<Result<ExpenseCategory>>; // HU-48
  updateCategory(id: string, input: { name: string; description?: string; active?: boolean }): Promise<Result<ExpenseCategory>>;
  getNotificationSettings(): Promise<NotificationSettings>; // HU-42
  updateNotificationSettings(input: NotificationSettings): Promise<Result>; // HU-42
}

export interface EmployeesService {
  list(filters: EmployeeFilters): Promise<Employee[]>; // HU-26
  positions(): Promise<string[]>;
  getRecord(id: string): Promise<EmployeeRecord | null>; // HU-27, 33, 34, 36
  create(input: EmployeeInput): Promise<Result<Employee>>; // HU-25
  update(id: string, input: EmployeeInput): Promise<Result<Employee>>; // HU-28
  deactivate(id: string, input: StatusChangeInput & { reason: string }): Promise<Result>; // HU-29
  reactivate(id: string, input: StatusChangeInput): Promise<Result>; // HU-29
  history(id: string, filters: WorkHistoryFilters): Promise<WorkHistoryEntry[]>; // HU-30
  addVacation(id: string, input: VacationInput): Promise<Result>; // HU-31
  updateVacation(id: string, vacationId: string, input: VacationInput): Promise<Result>; // HU-31
  cancelVacation(id: string, vacationId: string): Promise<Result>; // HU-31
  addDisability(id: string, input: DisabilityInput): Promise<Result>; // HU-32
  updateDisability(id: string, disabilityId: string, input: DisabilityInput): Promise<Result>; // HU-32
  cancelDisability(id: string, disabilityId: string): Promise<Result>; // HU-32
  addDocument(id: string, input: DocumentInput): Promise<Result>; // HU-33
  replaceDocument(id: string, documentId: string, file: { fileName: string; size: number }): Promise<Result>; // HU-34
  removeDocument(id: string, documentId: string): Promise<Result>; // HU-34
  addAdvance(id: string, input: AdvanceInput): Promise<Result<SalaryAdvance>>; // HU-35
  updateAdvance(id: string, advanceId: string, input: AdvanceInput): Promise<Result>; // HU-35
  cancelAdvance(id: string, advanceId: string): Promise<Result>; // HU-35
}

export interface PayrollService {
  list(filters: PayrollFilters): Promise<PayrollSummary[]>; // HU-17
  get(id: string): Promise<PayrollDetail | null>; // HU-17
  create(input: CreatePayrollInput): Promise<Result<Payroll>>; // HU-16 (el servidor calcula las líneas)
  editLine(payrollId: string, employeeId: string, input: { overtimeHours: number; extraDeduction: number; reason: string }): Promise<Result>; // HU-18
  close(payrollId: string): Promise<Result>; // cierre (requisito de HU-18 y HU-24)
  checkCcss(payrollId: string): Promise<CcssCheck>; // HU-24
  payslip(payrollId: string, employeeId: string): Promise<Payslip | null>; // colillas (alcance)
  listNovelties(filters: NoveltyFilters): Promise<Novelty[]>; // HU-19
  saveNovelty(input: NoveltyInput, id?: string): Promise<Result<Novelty>>; // HU-19
  cancelNovelty(id: string): Promise<Result>; // HU-19
  salaryView(employeeId: string, payrollId?: string): Promise<EmployeeSalaryView | null>; // HU-20
  updateSalaryData(employeeId: string, input: SalaryDataInput): Promise<Result>; // HU-21
  listRates(): Promise<GlobalRate[]>; // HU-22
  updateRate(id: string, input: RateInput): Promise<Result<GlobalRate>>; // HU-22
  calculateLiquidation(input: LiquidationInput): Promise<Result<LiquidationResult>>; // HU-23
  periodsForAdvances(): Promise<{ id: string; label: string }[]>; // HU-35
}

export interface CalendarService {
  month(year: number, month0: number): Promise<CalendarEvent[]>; // HU-55 a 60
}

export interface DashboardService {
  summary(): Promise<DashboardSummary>; // HU-61, 62, 63
  compareExpenses(mode: ComparisonMode, a: PeriodRef, b: PeriodRef): Promise<ExpenseComparison>; // HU-64
  comparePayroll(mode: ComparisonMode, a: PeriodRef, b: PeriodRef): Promise<PayrollComparison>; // HU-65
  availablePeriods(): Promise<{ years: number[] }>;
}

export type Services = {
  users: UsersService;
  roles: RolesService;
  audit: AuditService;
  expenses: ExpensesService;
  employees: EmployeesService;
  payroll: PayrollService;
  calendar: CalendarService;
  dashboard: DashboardService;
};
