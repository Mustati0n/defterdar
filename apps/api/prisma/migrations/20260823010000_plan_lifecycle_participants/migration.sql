-- Canonical lifecycle: ARCHIVED status and archivedAt always move together.
UPDATE "Plan"
SET "status" = 'ARCHIVED'
WHERE "archivedAt" IS NOT NULL AND "status" <> 'ARCHIVED';

UPDATE "Plan"
SET "archivedAt" = "updatedAt"
WHERE "archivedAt" IS NULL AND "status" = 'ARCHIVED';

ALTER TABLE "Plan"
ADD CONSTRAINT "Plan_lifecycle_check"
CHECK (
  ("status" = 'ARCHIVED' AND "archivedAt" IS NOT NULL)
  OR ("status" <> 'ARCHIVED' AND "archivedAt" IS NULL)
);

-- Foundation allowed guest participants before the participant API existed.
-- Preserve any historical rows, but require every newly written row to identify
-- a real User. The API only reads and writes user-backed participants.
ALTER TABLE "PlanParticipant"
ADD CONSTRAINT "PlanParticipant_user_required_check"
CHECK ("userId" IS NOT NULL) NOT VALID;
