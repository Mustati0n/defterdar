CREATE TABLE "LedgerInvitation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ledgerId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "invitedEmail" TEXT,
    "role" "LedgerRole" NOT NULL DEFAULT 'MEMBER',
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerInvitation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LedgerInvitation_member_role_check" CHECK ("role" = 'MEMBER')
);

CREATE UNIQUE INDEX "LedgerInvitation_tokenHash_key" ON "LedgerInvitation"("tokenHash");
CREATE INDEX "LedgerInvitation_ledgerId_idx" ON "LedgerInvitation"("ledgerId");
CREATE INDEX "LedgerInvitation_createdById_idx" ON "LedgerInvitation"("createdById");
CREATE INDEX "LedgerInvitation_expiresAt_idx" ON "LedgerInvitation"("expiresAt");

ALTER TABLE "LedgerInvitation"
ADD CONSTRAINT "LedgerInvitation_ledgerId_fkey"
FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LedgerInvitation"
ADD CONSTRAINT "LedgerInvitation_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Existing ledgers predate the authorization API. Ledger.ownerId is the
-- canonical owner during this non-destructive role/membership repair.
UPDATE "LedgerMembership" AS membership
SET "role" = 'ADMIN'
FROM "Ledger" AS ledger
WHERE membership."ledgerId" = ledger."id"
  AND membership."leftAt" IS NULL
  AND membership."role" = 'OWNER'
  AND membership."userId" <> ledger."ownerId";

UPDATE "LedgerMembership" AS membership
SET "role" = 'OWNER'
FROM "Ledger" AS ledger
WHERE membership."ledgerId" = ledger."id"
  AND membership."userId" = ledger."ownerId"
  AND membership."leftAt" IS NULL;

INSERT INTO "LedgerMembership" (
    "id", "ledgerId", "userId", "role", "joinedAt", "leftAt"
)
SELECT
    gen_random_uuid(), ledger."id", ledger."ownerId", 'OWNER', CURRENT_TIMESTAMP, NULL
FROM "Ledger" AS ledger
WHERE NOT EXISTS (
    SELECT 1
    FROM "LedgerMembership" AS membership
    WHERE membership."ledgerId" = ledger."id"
      AND membership."userId" = ledger."ownerId"
      AND membership."leftAt" IS NULL
);

-- PERSONAL ledgers can only retain their owner's active membership.
UPDATE "LedgerMembership" AS membership
SET "leftAt" = CURRENT_TIMESTAMP
FROM "Ledger" AS ledger
WHERE membership."ledgerId" = ledger."id"
  AND ledger."type" = 'PERSONAL'
  AND membership."leftAt" IS NULL
  AND membership."userId" <> ledger."ownerId";

-- Every existing user receives a PERSONAL ledger when one does not exist.
INSERT INTO "Ledger" (
    "id", "name", "description", "type", "currency", "ownerId",
    "createdAt", "updatedAt", "archivedAt"
)
SELECT
    gen_random_uuid(), 'Kişisel Defterim', NULL, 'PERSONAL', 'TRY', "id",
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL
FROM "User" AS app_user
WHERE NOT EXISTS (
    SELECT 1
    FROM "Ledger" AS ledger
    WHERE ledger."ownerId" = app_user."id"
      AND ledger."type" = 'PERSONAL'
);

INSERT INTO "LedgerMembership" (
    "id", "ledgerId", "userId", "role", "joinedAt", "leftAt"
)
SELECT
    gen_random_uuid(), ledger."id", ledger."ownerId", 'OWNER', CURRENT_TIMESTAMP, NULL
FROM "Ledger" AS ledger
WHERE ledger."type" = 'PERSONAL'
  AND NOT EXISTS (
    SELECT 1
    FROM "LedgerMembership" AS membership
    WHERE membership."ledgerId" = ledger."id"
      AND membership."userId" = ledger."ownerId"
      AND membership."leftAt" IS NULL
);

CREATE UNIQUE INDEX "Ledger_personal_owner_key"
ON "Ledger"("ownerId")
WHERE "type" = 'PERSONAL';

CREATE UNIQUE INDEX "LedgerMembership_active_owner_key"
ON "LedgerMembership"("ledgerId")
WHERE "role" = 'OWNER' AND "leftAt" IS NULL;

ALTER TABLE "Ledger"
ADD CONSTRAINT "Ledger_personal_not_archived_check"
CHECK ("type" = 'SHARED' OR "archivedAt" IS NULL);

CREATE FUNCTION "check_ledger_ownership_constraint"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    target_ledger_ids UUID[];
    target_ledger_id UUID;
    ledger_type TEXT;
    ledger_owner_id UUID;
    active_members INTEGER;
    active_owners INTEGER;
    canonical_owner_memberships INTEGER;
BEGIN
    IF TG_TABLE_NAME = 'Ledger' THEN
        IF TG_OP = 'DELETE' THEN
            target_ledger_ids := ARRAY[OLD."id"];
        ELSE
            target_ledger_ids := ARRAY[NEW."id"];
        END IF;
    ELSE
        IF TG_OP = 'DELETE' THEN
            target_ledger_ids := ARRAY[OLD."ledgerId"];
        ELSIF TG_OP = 'INSERT' THEN
            target_ledger_ids := ARRAY[NEW."ledgerId"];
        ELSIF OLD."ledgerId" IS DISTINCT FROM NEW."ledgerId" THEN
            target_ledger_ids := ARRAY[NEW."ledgerId", OLD."ledgerId"];
        ELSE
            target_ledger_ids := ARRAY[NEW."ledgerId"];
        END IF;
    END IF;

    FOREACH target_ledger_id IN ARRAY target_ledger_ids LOOP
        EXECUTE format(
            'SELECT "type"::text, "ownerId" FROM %I."Ledger" WHERE "id" = $1',
            TG_TABLE_SCHEMA
        )
        INTO ledger_type, ledger_owner_id
        USING target_ledger_id;

        IF FOUND THEN
            EXECUTE format(
                'SELECT
                    COUNT(*) FILTER (WHERE "leftAt" IS NULL),
                    COUNT(*) FILTER (WHERE "leftAt" IS NULL AND "role" = ''OWNER''),
                    COUNT(*) FILTER (
                        WHERE "leftAt" IS NULL
                          AND "role" = ''OWNER''
                          AND "userId" = $2
                    )
                 FROM %I."LedgerMembership"
                 WHERE "ledgerId" = $1',
                TG_TABLE_SCHEMA
            )
            INTO active_members, active_owners, canonical_owner_memberships
            USING target_ledger_id, ledger_owner_id;

            IF active_owners <> 1 OR canonical_owner_memberships <> 1 THEN
                RAISE EXCEPTION 'ledger % must have exactly one active canonical OWNER', target_ledger_id;
            END IF;

            IF ledger_type = 'PERSONAL' AND active_members <> 1 THEN
                RAISE EXCEPTION 'PERSONAL ledger % may only have its owner membership', target_ledger_id;
            END IF;
        END IF;
    END LOOP;
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "Ledger_ownership_constraint"
AFTER INSERT OR UPDATE ON "Ledger"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "check_ledger_ownership_constraint"();

CREATE CONSTRAINT TRIGGER "LedgerMembership_ownership_constraint"
AFTER INSERT OR UPDATE OR DELETE ON "LedgerMembership"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "check_ledger_ownership_constraint"();

CREATE FUNCTION "protect_ledger_identity"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."type" IS DISTINCT FROM OLD."type" THEN
        RAISE EXCEPTION 'ledger type is immutable';
    END IF;
    IF OLD."type" = 'PERSONAL' AND NEW."ownerId" IS DISTINCT FROM OLD."ownerId" THEN
        RAISE EXCEPTION 'PERSONAL ledger ownership is immutable';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "Ledger_identity_protection"
BEFORE UPDATE ON "Ledger"
FOR EACH ROW EXECUTE FUNCTION "protect_ledger_identity"();
