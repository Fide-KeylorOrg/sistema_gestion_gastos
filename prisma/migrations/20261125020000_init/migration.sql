-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "IdType" AS ENUM ('NATIONAL_ID', 'DIMEX', 'PASSPORT');

-- CreateEnum
CREATE TYPE "SalaryBasis" AS ENUM ('MONTHLY', 'HOURLY');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('NATIONAL_ID', 'CONTRACT', 'CRIMINAL_RECORD', 'RECOMMENDATION_LETTER', 'OTHER');

-- CreateEnum
CREATE TYPE "LeaveKind" AS ENUM ('VACATION', 'SICK_LEAVE');

-- CreateEnum
CREATE TYPE "SickLeaveType" AS ENUM ('CCSS', 'INS', 'OTHER');

-- CreateEnum
CREATE TYPE "TimeEntryKind" AS ENUM ('OVERTIME', 'UNPAID_LEAVE');

-- CreateEnum
CREATE TYPE "RateScope" AS ENUM ('EMPLOYEE', 'EMPLOYER');

-- CreateEnum
CREATE TYPE "PayrollItemKind" AS ENUM ('EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION');

-- CreateEnum
CREATE TYPE "ExpenseKind" AS ENUM ('PAYMENT', 'PERMIT');

-- CreateEnum
CREATE TYPE "Recurrence" AS ENUM ('NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "roleId" UUID NOT NULL,
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" TEXT[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" BIGSERIAL NOT NULL,
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "detail" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoredFile" (
    "id" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" UUID NOT NULL,
    "uploadedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" UUID NOT NULL,
    "idType" "IdType" NOT NULL,
    "idNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName1" TEXT NOT NULL,
    "lastName2" TEXT,
    "birthDate" DATE NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "position" TEXT NOT NULL,
    "hireDate" DATE NOT NULL,
    "contractEndsOn" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "statusChangedAt" DATE,
    "statusReason" TEXT,
    "salaryBasis" "SalaryBasis" NOT NULL,
    "baseSalary" DECIMAL(14,2) NOT NULL,
    "salaryEffectiveFrom" DATE NOT NULL,
    "openingVacationDays" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDocument" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileId" UUID NOT NULL,
    "replacesId" UUID,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leave" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "kind" "LeaveKind" NOT NULL,
    "sickLeaveType" "SickLeaveType",
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "days" DECIMAL(4,1) NOT NULL,
    "proofFileId" UUID,
    "voidedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Leave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "payrollId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "kind" "TimeEntryKind" NOT NULL,
    "hours" DECIMAL(5,2) NOT NULL,
    "note" TEXT,
    "voidedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryAdvance" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "payrollId" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "voidedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SalaryAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRate" (
    "id" UUID NOT NULL,
    "scope" "RateScope" NOT NULL,
    "code" TEXT NOT NULL,
    "percent" DECIMAL(6,3) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeTaxTable" (
    "id" UUID NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncomeTaxTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeTaxBracket" (
    "id" UUID NOT NULL,
    "tableId" UUID NOT NULL,
    "lowerBound" DECIMAL(14,2) NOT NULL,
    "upperBound" DECIMAL(14,2),
    "percent" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "IncomeTaxBracket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" UUID NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "payDate" DATE NOT NULL,
    "closedAt" TIMESTAMPTZ(3),
    "paidAt" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollLine" (
    "id" UUID NOT NULL,
    "payrollId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "salaryBasis" "SalaryBasis" NOT NULL,
    "baseSalary" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "PayrollLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollItem" (
    "id" UUID NOT NULL,
    "lineId" UUID NOT NULL,
    "kind" "PayrollItemKind" NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2),
    "rate" DECIMAL(12,6),
    "amount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "PayrollItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" UUID NOT NULL,
    "concept" TEXT NOT NULL,
    "categoryId" UUID NOT NULL,
    "kind" "ExpenseKind" NOT NULL DEFAULT 'PAYMENT',
    "estimatedAmount" DECIMAL(14,2) NOT NULL,
    "referenceNumber" TEXT,
    "notes" TEXT,
    "recurrence" "Recurrence" NOT NULL DEFAULT 'NONE',
    "recurrenceEndsOn" DATE,
    "notifyDaysBefore" INTEGER DEFAULT 7,
    "extraRecipients" TEXT[],
    "attachmentFileId" UUID,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseDue" (
    "id" UUID NOT NULL,
    "expenseId" UUID NOT NULL,
    "dueDate" DATE NOT NULL,
    "estimatedAmount" DECIMAL(14,2) NOT NULL,
    "generatedByPaymentId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ExpenseDue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpensePayment" (
    "id" UUID NOT NULL,
    "dueId" UUID NOT NULL,
    "paidAt" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "receiptFileId" UUID,
    "voidedAt" TIMESTAMPTZ(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpensePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRecipient" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" BIGSERIAL NOT NULL,
    "dueId" UUID NOT NULL,
    "sentAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipients" TEXT[],

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_at_idx" ON "AuditLog"("at");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "StoredFile_storageKey_key" ON "StoredFile"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_idType_idNumber_key" ON "Employee"("idType", "idNumber");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeDocument_fileId_key" ON "EmployeeDocument"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeDocument_replacesId_key" ON "EmployeeDocument"("replacesId");

-- CreateIndex
CREATE INDEX "EmployeeDocument_employeeId_idx" ON "EmployeeDocument"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Leave_proofFileId_key" ON "Leave"("proofFileId");

-- CreateIndex
CREATE INDEX "Leave_employeeId_idx" ON "Leave"("employeeId");

-- CreateIndex
CREATE INDEX "TimeEntry_employeeId_idx" ON "TimeEntry"("employeeId");

-- CreateIndex
CREATE INDEX "TimeEntry_payrollId_idx" ON "TimeEntry"("payrollId");

-- CreateIndex
CREATE INDEX "SalaryAdvance_employeeId_idx" ON "SalaryAdvance"("employeeId");

-- CreateIndex
CREATE INDEX "SalaryAdvance_payrollId_idx" ON "SalaryAdvance"("payrollId");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_date_key" ON "Holiday"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRate_scope_code_effectiveFrom_key" ON "PayrollRate"("scope", "code", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "IncomeTaxTable_effectiveFrom_key" ON "IncomeTaxTable"("effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "IncomeTaxBracket_tableId_lowerBound_key" ON "IncomeTaxBracket"("tableId", "lowerBound");

-- CreateIndex
CREATE INDEX "PayrollLine_employeeId_idx" ON "PayrollLine"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollLine_payrollId_employeeId_key" ON "PayrollLine"("payrollId", "employeeId");

-- CreateIndex
CREATE INDEX "PayrollItem_lineId_idx" ON "PayrollItem"("lineId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_name_key" ON "ExpenseCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_attachmentFileId_key" ON "Expense"("attachmentFileId");

-- CreateIndex
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseDue_generatedByPaymentId_key" ON "ExpenseDue"("generatedByPaymentId");

-- CreateIndex
CREATE INDEX "ExpenseDue_dueDate_idx" ON "ExpenseDue"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseDue_expenseId_dueDate_key" ON "ExpenseDue"("expenseId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "ExpensePayment_receiptFileId_key" ON "ExpensePayment"("receiptFileId");

-- CreateIndex
CREATE INDEX "ExpensePayment_dueId_idx" ON "ExpensePayment"("dueId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRecipient_email_key" ON "NotificationRecipient"("email");

-- CreateIndex
CREATE INDEX "NotificationLog_dueId_idx" ON "NotificationLog"("dueId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_replacesId_fkey" FOREIGN KEY ("replacesId") REFERENCES "EmployeeDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_proofFileId_fkey" FOREIGN KEY ("proofFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryAdvance" ADD CONSTRAINT "SalaryAdvance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryAdvance" ADD CONSTRAINT "SalaryAdvance_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeTaxBracket" ADD CONSTRAINT "IncomeTaxBracket_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "IncomeTaxTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "PayrollLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_attachmentFileId_fkey" FOREIGN KEY ("attachmentFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseDue" ADD CONSTRAINT "ExpenseDue_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseDue" ADD CONSTRAINT "ExpenseDue_generatedByPaymentId_fkey" FOREIGN KEY ("generatedByPaymentId") REFERENCES "ExpensePayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpensePayment" ADD CONSTRAINT "ExpensePayment_dueId_fkey" FOREIGN KEY ("dueId") REFERENCES "ExpenseDue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpensePayment" ADD CONSTRAINT "ExpensePayment_receiptFileId_fkey" FOREIGN KEY ("receiptFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_dueId_fkey" FOREIGN KEY ("dueId") REFERENCES "ExpenseDue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------- Rules Prisma can't express (risks R03, R07, R11) ----------
-- Prisma ignores CHECK/EXCLUDE constraints and triggers, so later migrations keep them.

-- AuditLog is append-only (HU-12): the database itself rejects UPDATE and DELETE.
CREATE FUNCTION audit_log_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only';
END;
$$;

CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();

ALTER TABLE "Employee" ADD CONSTRAINT "Employee_baseSalary_positive" CHECK ("baseSalary" > 0);

ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_period_valid" CHECK ("periodEnd" >= "periodStart");
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_no_overlap"
  EXCLUDE USING gist (daterange("periodStart", "periodEnd", '[]') WITH &&);
-- A draft payroll can still change, so it cannot be marked as paid.
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_paid_requires_closed" CHECK ("paidAt" IS NULL OR "closedAt" IS NOT NULL);

ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_amount_nonnegative" CHECK ("amount" >= 0);

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_estimatedAmount_positive" CHECK ("estimatedAmount" > 0);
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_notifyDaysBefore_range" CHECK ("notifyDaysBefore" BETWEEN 1 AND 10);

ALTER TABLE "ExpenseDue" ADD CONSTRAINT "ExpenseDue_estimatedAmount_positive" CHECK ("estimatedAmount" > 0);

ALTER TABLE "ExpensePayment" ADD CONSTRAINT "ExpensePayment_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "ExpensePayment" ADD CONSTRAINT "ExpensePayment_void_complete" CHECK (("voidedAt" IS NULL) = ("voidReason" IS NULL));
-- One non-voided payment per due (HU-39).
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "ExpensePayment" ADD CONSTRAINT "ExpensePayment_one_active_per_due"
  EXCLUDE USING gist ("dueId" WITH =) WHERE ("voidedAt" IS NULL);

-- Rules for employee records, leaves, novedades, advances, files and payroll rates.
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_contract_after_hire" CHECK ("contractEndsOn" IS NULL OR "contractEndsOn" >= "hireDate");

ALTER TABLE "Leave" ADD CONSTRAINT "Leave_period_valid" CHECK ("endDate" >= "startDate" AND "days" > 0);
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_sick_type_only_for_sick_leave" CHECK (("kind" = 'SICK_LEAVE') = ("sickLeaveType" IS NOT NULL));
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_proof_only_for_sick_leave" CHECK ("proofFileId" IS NULL OR "kind" = 'SICK_LEAVE');
-- An employee's active vacations and sick leaves never overlap (HU-27, HU-28).
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_no_overlap"
  EXCLUDE USING gist ("employeeId" WITH =, daterange("startDate", "endDate", '[]') WITH &&) WHERE ("voidedAt" IS NULL);

ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_hours_positive" CHECK ("hours" > 0);
ALTER TABLE "SalaryAdvance" ADD CONSTRAINT "SalaryAdvance_amount_positive" CHECK ("amount" > 0);

-- PDF, JPG or PNG up to 10 MB (HU-29); the type is checked by the app.
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_size_limit" CHECK ("sizeBytes" BETWEEN 1 AND 10485760);

-- Versioned rates (HU-19): one row per component and period, with no overlaps.
ALTER TABLE "PayrollRate" ADD CONSTRAINT "PayrollRate_valid" CHECK ("percent" >= 0 AND "effectiveTo" >= "effectiveFrom");
ALTER TABLE "PayrollRate" ADD CONSTRAINT "PayrollRate_no_overlap"
  EXCLUDE USING gist ("scope" WITH =, "code" WITH =, daterange("effectiveFrom", "effectiveTo", '[]') WITH &&);
ALTER TABLE "IncomeTaxTable" ADD CONSTRAINT "IncomeTaxTable_period_valid" CHECK ("effectiveTo" >= "effectiveFrom");
ALTER TABLE "IncomeTaxTable" ADD CONSTRAINT "IncomeTaxTable_no_overlap"
  EXCLUDE USING gist (daterange("effectiveFrom", "effectiveTo", '[]') WITH &&);
ALTER TABLE "IncomeTaxBracket" ADD CONSTRAINT "IncomeTaxBracket_valid"
  CHECK ("lowerBound" >= 0 AND ("upperBound" IS NULL OR "upperBound" > "lowerBound") AND "percent" BETWEEN 0 AND 100);
