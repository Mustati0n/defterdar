CREATE TYPE "SettlementStatus" AS ENUM (
  'PENDING',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
  'VOID'
);

ALTER TABLE "Settlement"
  ADD COLUMN "status" "SettlementStatus" NOT NULL DEFAULT 'CONFIRMED',
  ADD COLUMN "confirmedById" UUID,
  ADD COLUMN "confirmedAt" TIMESTAMPTZ(3),
  ADD COLUMN "rejectedById" UUID,
  ADD COLUMN "rejectedAt" TIMESTAMPTZ(3),
  ADD COLUMN "cancelledAt" TIMESTAMPTZ(3);

-- Historical settlements already participated in balances. Preserve that
-- financial truth by marking every legacy non-void record as confirmed.
UPDATE "Settlement"
SET
  "status" = CASE WHEN "voidedAt" IS NULL THEN 'CONFIRMED'::"SettlementStatus" ELSE 'VOID'::"SettlementStatus" END,
  "confirmedById" = CASE WHEN "voidedAt" IS NULL THEN "createdById" ELSE NULL END,
  "confirmedAt" = CASE WHEN "voidedAt" IS NULL THEN "createdAt" ELSE NULL END;

ALTER TABLE "Settlement"
  ADD CONSTRAINT "Settlement_confirmedById_fkey"
  FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Settlement_rejectedById_fkey"
  FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Settlement_confirmedById_idx" ON "Settlement"("confirmedById");
CREATE INDEX "Settlement_rejectedById_idx" ON "Settlement"("rejectedById");
CREATE INDEX "Settlement_ledgerId_status_idx" ON "Settlement"("ledgerId", "status");
CREATE INDEX "Settlement_planId_status_idx" ON "Settlement"("planId", "status");
