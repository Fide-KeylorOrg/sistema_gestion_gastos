import type { Services } from "../contracts";
import { demoAuditService, demoRolesService, demoUsersService } from "./users";
import { demoExpensesService } from "./expenses";
import { demoEmployeesService } from "./employees";
import { demoPayrollService } from "./payroll";
import { demoCalendarService } from "./calendar";
import { demoDashboardService } from "./dashboard";

export const demoServices: Services = {
  users: demoUsersService,
  roles: demoRolesService,
  audit: demoAuditService,
  expenses: demoExpensesService,
  employees: demoEmployeesService,
  payroll: demoPayrollService,
  calendar: demoCalendarService,
  dashboard: demoDashboardService,
};
