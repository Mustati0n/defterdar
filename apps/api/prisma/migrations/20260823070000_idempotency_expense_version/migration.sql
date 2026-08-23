ALTER TABLE "Expense" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_version_positive" CHECK ("version" > 0);

CREATE TABLE "IdempotencyRecord" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "operation" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "requestHash" CHAR(64) NOT NULL,
  "responseStatus" INTEGER,
  "responseBody" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IdempotencyRecord_key_length" CHECK (length("key") BETWEEN 1 AND 200),
  CONSTRAINT "IdempotencyRecord_operation_nonempty" CHECK (length("operation") > 0),
  CONSTRAINT "IdempotencyRecord_request_hash" CHECK ("requestHash" ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX "IdempotencyRecord_userId_operation_key_key"
  ON "IdempotencyRecord"("userId", "operation", "key");
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");

ALTER TABLE "IdempotencyRecord"
  ADD CONSTRAINT "IdempotencyRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
