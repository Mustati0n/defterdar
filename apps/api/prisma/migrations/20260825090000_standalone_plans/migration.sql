ALTER TABLE "Plan" ADD COLUMN "currency" VARCHAR(3);

UPDATE "Plan" AS p
SET "currency" = l."currency"
FROM "Ledger" AS l
WHERE p."ledgerId" = l."id";

ALTER TABLE "Plan" ALTER COLUMN "currency" SET NOT NULL;
ALTER TABLE "Plan" ALTER COLUMN "ledgerId" DROP NOT NULL;
ALTER TABLE "Expense" ALTER COLUMN "ledgerId" DROP NOT NULL;
ALTER TABLE "Income" ALTER COLUMN "ledgerId" DROP NOT NULL;
ALTER TABLE "Settlement" ALTER COLUMN "ledgerId" DROP NOT NULL;
ALTER TABLE "ActivityLog" ALTER COLUMN "ledgerId" DROP NOT NULL;
ALTER TABLE "ActivityLog" ADD COLUMN "planId" UUID;

ALTER TABLE "Plan"
  ADD CONSTRAINT "Plan_currency_format_check"
  CHECK ("currency" ~ '^[A-Z]{3}$');

ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_financial_scope_check"
  CHECK ("ledgerId" IS NOT NULL OR "planId" IS NOT NULL);

ALTER TABLE "Income"
  ADD CONSTRAINT "Income_financial_scope_check"
  CHECK ("ledgerId" IS NOT NULL OR "planId" IS NOT NULL);

ALTER TABLE "Settlement"
  ADD CONSTRAINT "Settlement_financial_scope_check"
  CHECK ("ledgerId" IS NOT NULL OR "planId" IS NOT NULL);

ALTER TABLE "ActivityLog"
  ADD CONSTRAINT "ActivityLog_scope_check"
  CHECK ("ledgerId" IS NOT NULL OR "planId" IS NOT NULL);

ALTER TABLE "ActivityLog"
  ADD CONSTRAINT "ActivityLog_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "ActivityLog_planId_createdAt_id_idx"
  ON "ActivityLog"("planId", "createdAt", "id");

CREATE TABLE "PlanInvitation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "planId" UUID NOT NULL,
  "invitedEmail" TEXT NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "acceptedAt" TIMESTAMPTZ(3),
  "revokedAt" TIMESTAMPTZ(3),
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlanInvitation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlanInvitation_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PlanInvitation_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PlanInvitation_tokenHash_key" ON "PlanInvitation"("tokenHash");
CREATE INDEX "PlanInvitation_planId_idx" ON "PlanInvitation"("planId");
CREATE INDEX "PlanInvitation_createdById_idx" ON "PlanInvitation"("createdById");
CREATE INDEX "PlanInvitation_expiresAt_idx" ON "PlanInvitation"("expiresAt");
