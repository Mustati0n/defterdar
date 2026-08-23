CREATE TYPE "CategoryKind" AS ENUM ('EXPENSE', 'INCOME', 'BOTH');

CREATE TABLE "Category" (
  "id" UUID NOT NULL,
  "ledgerId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "CategoryKind" NOT NULL,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "archivedAt" TIMESTAMPTZ(3),
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Category_name_nonempty" CHECK (length(btrim("name")) > 0)
);

CREATE UNIQUE INDEX "Category_ledgerId_name_ci_key"
  ON "Category" ("ledgerId", lower(btrim("name")));
CREATE INDEX "Category_ledgerId_idx" ON "Category"("ledgerId");
CREATE INDEX "Category_createdById_idx" ON "Category"("createdById");

ALTER TABLE "Category"
  ADD CONSTRAINT "Category_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Category_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Expense" ADD COLUMN "categoryId" UUID;
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");
CREATE INDEX "Expense_ledgerId_expenseDate_idx" ON "Expense"("ledgerId", "expenseDate");
CREATE INDEX "Expense_planId_expenseDate_idx" ON "Expense"("planId", "expenseDate");
ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Income" (
  "id" UUID NOT NULL,
  "ledgerId" UUID NOT NULL,
  "planId" UUID,
  "createdById" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "amountMinor" BIGINT NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "categoryId" UUID,
  "incomeDate" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "voidedAt" TIMESTAMPTZ(3),
  CONSTRAINT "Income_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Income_amount_positive" CHECK ("amountMinor" > 0),
  CONSTRAINT "Income_currency_uppercase" CHECK ("currency" ~ '^[A-Z]{3}$')
);

CREATE INDEX "Income_ledgerId_idx" ON "Income"("ledgerId");
CREATE INDEX "Income_planId_idx" ON "Income"("planId");
CREATE INDEX "Income_createdById_idx" ON "Income"("createdById");
CREATE INDEX "Income_categoryId_idx" ON "Income"("categoryId");
CREATE INDEX "Income_ledgerId_incomeDate_idx" ON "Income"("ledgerId", "incomeDate");
CREATE INDEX "Income_planId_incomeDate_idx" ON "Income"("planId", "incomeDate");

ALTER TABLE "Income"
  ADD CONSTRAINT "Income_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Income_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Income_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Income_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
