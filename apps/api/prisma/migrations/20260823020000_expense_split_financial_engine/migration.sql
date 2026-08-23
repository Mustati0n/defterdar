CREATE TYPE "ExpenseSplitMethod" AS ENUM ('EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES');

CREATE TABLE "Expense" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ledgerId" UUID NOT NULL, "planId" UUID, "createdById" UUID NOT NULL, "payerId" UUID NOT NULL,
  "title" TEXT NOT NULL, "description" TEXT, "amountMinor" BIGINT NOT NULL, "currency" VARCHAR(3) NOT NULL,
  "splitMethod" "ExpenseSplitMethod" NOT NULL, "isGift" BOOLEAN NOT NULL DEFAULT false,
  "expenseDate" TIMESTAMPTZ(3) NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL, "voidedAt" TIMESTAMPTZ(3),
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Expense_amount_positive_check" CHECK ("amountMinor" > 0)
);
CREATE TABLE "ExpenseSplit" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "expenseId" UUID NOT NULL, "userId" UUID NOT NULL,
  "amountMinor" BIGINT NOT NULL, "isReimbursable" BOOLEAN NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExpenseSplit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ExpenseSplit_amount_nonnegative_check" CHECK ("amountMinor" >= 0)
);
CREATE UNIQUE INDEX "ExpenseSplit_expenseId_userId_key" ON "ExpenseSplit"("expenseId", "userId");
CREATE INDEX "Expense_ledgerId_idx" ON "Expense"("ledgerId");
CREATE INDEX "Expense_planId_idx" ON "Expense"("planId");
CREATE INDEX "Expense_createdById_idx" ON "Expense"("createdById");
CREATE INDEX "Expense_payerId_idx" ON "Expense"("payerId");
CREATE INDEX "ExpenseSplit_userId_idx" ON "ExpenseSplit"("userId");
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExpenseSplit" ADD CONSTRAINT "ExpenseSplit_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExpenseSplit" ADD CONSTRAINT "ExpenseSplit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
