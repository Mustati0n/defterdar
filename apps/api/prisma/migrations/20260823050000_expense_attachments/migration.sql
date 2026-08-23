CREATE TYPE "AttachmentStatus" AS ENUM ('PENDING', 'READY');

CREATE TABLE "ExpenseAttachment" (
  "id" UUID NOT NULL,
  "expenseId" UUID NOT NULL,
  "storageKey" TEXT NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "status" "AttachmentStatus" NOT NULL DEFAULT 'PENDING',
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ(3),
  "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "ExpenseAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ExpenseAttachment_size_positive" CHECK ("sizeBytes" > 0),
  CONSTRAINT "ExpenseAttachment_mime_allowed" CHECK ("mimeType" IN ('image/jpeg', 'image/png', 'image/webp')),
  CONSTRAINT "ExpenseAttachment_completion_state" CHECK (
    ("status" = 'PENDING' AND "completedAt" IS NULL) OR
    ("status" = 'READY' AND "completedAt" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "ExpenseAttachment_storageKey_key" ON "ExpenseAttachment"("storageKey");
CREATE INDEX "ExpenseAttachment_expenseId_idx" ON "ExpenseAttachment"("expenseId");
CREATE INDEX "ExpenseAttachment_createdById_idx" ON "ExpenseAttachment"("createdById");
CREATE INDEX "ExpenseAttachment_expenseId_deletedAt_idx" ON "ExpenseAttachment"("expenseId", "deletedAt");

ALTER TABLE "ExpenseAttachment"
  ADD CONSTRAINT "ExpenseAttachment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ExpenseAttachment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
