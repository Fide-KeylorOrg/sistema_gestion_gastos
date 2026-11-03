export const PERMISSIONS = [
  "users.manage",
  "dashboard.view",
  "payroll.view",
  "payroll.edit",
  "payroll.salaries",
  "expenses.view",
  "expenses.edit",
  "calendar.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
