-- A draft payroll can still change, so it cannot be marked as paid.
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_paid_requires_closed" CHECK ("paidAt" IS NULL OR "closedAt" IS NOT NULL);
