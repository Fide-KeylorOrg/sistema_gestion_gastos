-- CreateEnum
CREATE TYPE "IdType" AS ENUM ('NATIONAL_ID', 'DIMEX', 'PASSPORT');

-- CreateEnum
CREATE TYPE "SalaryBasis" AS ENUM ('MONTHLY', 'HOURLY');

-- CreateEnum
CREATE TYPE "PayrollItemKind" AS ENUM ('EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION');

-- CreateEnum
CREATE TYPE "ExpenseKind" AS ENUM ('PAYMENT', 'PERMIT');

-- CreateEnum
CREATE TYPE "Recurrence" AS ENUM ('NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'YEARLY');

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
    "active" BOOLEAN NOT NULL DEFAULT true,
    "statusChangedAt" DATE,
    "statusReason" TEXT,
    "salaryBasis" "SalaryBasis" NOT NULL,
    "baseSalary" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" UUID NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
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
    "paidAt" DATE,
    "paidAmount" DECIMAL(14,2),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ExpenseDue_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "Employee_idType_idNumber_key" ON "Employee"("idType", "idNumber");

-- CreateIndex
CREATE INDEX "PayrollLine_employeeId_idx" ON "PayrollLine"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollLine_payrollId_employeeId_key" ON "PayrollLine"("payrollId", "employeeId");

-- CreateIndex
CREATE INDEX "PayrollItem_lineId_idx" ON "PayrollItem"("lineId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_name_key" ON "ExpenseCategory"("name");

-- CreateIndex
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");

-- CreateIndex
CREATE INDEX "ExpenseDue_dueDate_idx" ON "ExpenseDue"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseDue_expenseId_dueDate_key" ON "ExpenseDue"("expenseId", "dueDate");

-- CreateIndex
CREATE INDEX "NotificationLog_dueId_idx" ON "NotificationLog"("dueId");

-- AddForeignKey
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "PayrollLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseDue" ADD CONSTRAINT "ExpenseDue_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_dueId_fkey" FOREIGN KEY ("dueId") REFERENCES "ExpenseDue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Rules Prisma can't express (risks R03, R07, R11). Prisma ignores CHECK and EXCLUDE constraints, so later migrations keep them.
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_baseSalary_positive" CHECK ("baseSalary" > 0);

ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_period_valid" CHECK ("periodEnd" >= "periodStart");
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_no_overlap"
  EXCLUDE USING gist (daterange("periodStart", "periodEnd", '[]') WITH &&);

ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_amount_nonnegative" CHECK ("amount" >= 0);

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_estimatedAmount_positive" CHECK ("estimatedAmount" > 0);
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_notifyDaysBefore_nonnegative" CHECK ("notifyDaysBefore" >= 0);

ALTER TABLE "ExpenseDue" ADD CONSTRAINT "ExpenseDue_estimatedAmount_positive" CHECK ("estimatedAmount" > 0);
ALTER TABLE "ExpenseDue" ADD CONSTRAINT "ExpenseDue_payment_complete"
  CHECK (("paidAt" IS NULL) = ("paidAmount" IS NULL) AND ("paidAmount" IS NULL OR "paidAmount" > 0));
