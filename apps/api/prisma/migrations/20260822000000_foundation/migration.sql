CREATE TYPE "LedgerType" AS ENUM ('PERSONAL', 'SHARED');
CREATE TYPE "LedgerRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Ledger" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "LedgerType" NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "ownerId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),
    CONSTRAINT "Ledger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LedgerMembership" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ledgerId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "LedgerRole" NOT NULL,
    "joinedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMPTZ(3),
    CONSTRAINT "LedgerMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Plan" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ledgerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMPTZ(3),
    "endsAt" TIMESTAMPTZ(3),
    "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),
    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Plan_dates_check" CHECK ("endsAt" IS NULL OR "startsAt" IS NULL OR "endsAt" >= "startsAt")
);

CREATE TABLE "PlanParticipant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "planId" UUID NOT NULL,
    "userId" UUID,
    "guestName" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlanParticipant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PlanParticipant_identity_check" CHECK (
      ("userId" IS NOT NULL AND "guestName" IS NULL)
      OR ("userId" IS NULL AND NULLIF(BTRIM("guestName"), '') IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Ledger_ownerId_idx" ON "Ledger"("ownerId");
CREATE INDEX "LedgerMembership_ledgerId_idx" ON "LedgerMembership"("ledgerId");
CREATE INDEX "LedgerMembership_userId_idx" ON "LedgerMembership"("userId");
CREATE UNIQUE INDEX "LedgerMembership_active_key" ON "LedgerMembership"("ledgerId", "userId") WHERE "leftAt" IS NULL;
CREATE INDEX "Plan_ledgerId_idx" ON "Plan"("ledgerId");
CREATE INDEX "Plan_createdById_idx" ON "Plan"("createdById");
CREATE UNIQUE INDEX "PlanParticipant_planId_userId_key" ON "PlanParticipant"("planId", "userId");
CREATE INDEX "PlanParticipant_planId_idx" ON "PlanParticipant"("planId");
CREATE INDEX "PlanParticipant_userId_idx" ON "PlanParticipant"("userId");

ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerMembership" ADD CONSTRAINT "LedgerMembership_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerMembership" ADD CONSTRAINT "LedgerMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanParticipant" ADD CONSTRAINT "PlanParticipant_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanParticipant" ADD CONSTRAINT "PlanParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
