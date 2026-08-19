-- The director role.
--
-- A director sits at the same level as a partner in every respect this system
-- cares about — approvals, access, the dashboard, the menu. The role exists
-- because the firm distinguishes the two, and because the billing is divided
-- between "the partners and the directors" rather than either alone.
--
-- WHY THIS FILE DOES NOT CREATE A TABLE FOR THE BILL DIVISION
--
-- It was going to. The division of each bill was to be its own table, keyed to
-- billing_records — which turned out not to exist. Bills in this system are not
-- rows: they are JSON documents in the key-value table, written under keys
-- prefixed 'billing:', and there is no relational table to point a foreign key
-- at.
--
-- So the division travels inside the bill it divides, as a `shares` array on the
-- same document. That is better than the table would have been, and not only
-- because it needs no migration: a share and the bill it is a share OF are
-- written in one operation and cannot drift apart, and a bill's division is read
-- by whoever already has the bill in hand rather than by a second query.
--
-- Safe to re-run.

-- Rebuilt rather than added to: the constraint most live databases carry came
-- from archive/database-add-staff-FIXED.sql and still permits the legacy
-- TitleCase spellings, so they are kept. The app normalises them on the way in
-- (src/app/utils/roles.ts); dropping them here would reject rows that exist.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (
  'admin', 'partner', 'director', 'team-leader', 'team-member', 'client',
  -- Legacy, still present in older rows.
  'Admin', 'Partner', 'Staff', 'Team Member', 'Team Leader', 'Accounts'
));

DO $$
DECLARE
  directors INTEGER;
BEGIN
  SELECT COUNT(*) INTO directors FROM users WHERE role = 'director';
  RAISE NOTICE '';
  RAISE NOTICE 'director role accepted (% user(s) hold it).', directors;
  RAISE NOTICE 'Existing users are untouched; legacy role spellings still permitted.';
  RAISE NOTICE '';
END $$;
