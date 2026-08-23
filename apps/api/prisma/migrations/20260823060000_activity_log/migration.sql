CREATE TABLE "ActivityLog" (
  "id" UUID NOT NULL,
  "ledgerId" UUID NOT NULL,
  "actorUserId" UUID,
  "entityType" TEXT NOT NULL,
  "entityId" UUID NOT NULL,
  "action" TEXT NOT NULL,
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ActivityLog_ledgerId_createdAt_id_idx" ON "ActivityLog"("ledgerId", "createdAt", "id");
CREATE INDEX "ActivityLog_actorUserId_idx" ON "ActivityLog"("actorUserId");
CREATE INDEX "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");

ALTER TABLE "ActivityLog"
  ADD CONSTRAINT "ActivityLog_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ActivityLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_activity_log_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ActivityLog is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ActivityLog_immutable_update"
BEFORE UPDATE ON "ActivityLog"
FOR EACH ROW EXECUTE FUNCTION prevent_activity_log_mutation();

CREATE TRIGGER "ActivityLog_immutable_delete"
BEFORE DELETE ON "ActivityLog"
FOR EACH ROW EXECUTE FUNCTION prevent_activity_log_mutation();
