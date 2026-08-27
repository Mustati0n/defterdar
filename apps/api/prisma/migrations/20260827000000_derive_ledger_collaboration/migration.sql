-- Derive Ledger collaboration from membership instead of a user-selected type.
--
-- Removing the PERSONAL/SHARED product distinction must not weaken the
-- ownership invariant. We drop the type column and every constraint that
-- referenced it, then re-create the canonical-owner constraint without the
-- PERSONAL single-member rule.

-- 1. Drop triggers that reference the "type" column (function bodies mention
--    it, so they must go before the column is removed).
DROP TRIGGER IF EXISTS "Ledger_identity_protection" ON "Ledger";
DROP TRIGGER IF EXISTS "Ledger_ownership_constraint" ON "Ledger";
DROP TRIGGER IF EXISTS "LedgerMembership_ownership_constraint" ON "LedgerMembership";

DROP FUNCTION IF EXISTS "protect_ledger_identity"();
DROP FUNCTION IF EXISTS "check_ledger_ownership_constraint"();

-- 2. Drop indexes/constraints that depend on "type".
DROP INDEX IF EXISTS "Ledger_personal_owner_key";

ALTER TABLE "Ledger"
DROP CONSTRAINT IF EXISTS "Ledger_personal_not_archived_check";

-- 3. Remove the column and the enum.
ALTER TABLE "Ledger" DROP COLUMN "type";

DROP TYPE IF EXISTS "LedgerType";

-- 4. Re-create the canonical ownership constraint (exactly one active OWNER
--    whose userId matches Ledger.ownerId), now independent of ledger type.
CREATE FUNCTION "check_ledger_ownership_constraint"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    target_ledger_ids UUID[];
    target_ledger_id UUID;
    ledger_owner_id UUID;
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
            'SELECT "ownerId" FROM %I."Ledger" WHERE "id" = $1',
            TG_TABLE_SCHEMA
        )
        INTO ledger_owner_id
        USING target_ledger_id;

        IF FOUND THEN
            EXECUTE format(
                'SELECT
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
            INTO active_owners, canonical_owner_memberships
            USING target_ledger_id, ledger_owner_id;

            IF active_owners <> 1 OR canonical_owner_memberships <> 1 THEN
                RAISE EXCEPTION 'ledger % must have exactly one active canonical OWNER', target_ledger_id;
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
