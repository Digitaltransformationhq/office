-- The division of a bill, decided where it is actually known.
--
-- THE PROBLEM
--
-- Accounts raises the invoice, but the division of it is not theirs to decide.
-- The partner who owns the work is the only person who knows whether a job was
-- shared, and with whom. Asking Accounts for it at billing time meant either a
-- guess or a phone call, and a guess is what would have happened — the form
-- offered a sensible-looking default and no way to tell whether anybody had
-- actually thought about it.
--
-- THE FIX
--
-- The partner states the division at the moment they approve the finished work,
-- in the same dialog where they already set the amount to be billed. It travels
-- with the task from there, and Accounts opens the billing dialog to find it
-- filled in, with the name of whoever decided it.
--
-- WHY JSONB AND NOT A TABLE
--
-- This is a draft, not a record. It is the partner's instruction to Accounts,
-- and it stops mattering the moment the bill is raised — at which point the real
-- record is written onto the bill itself and lives there for good. A table of
-- its own would imply the two are the same thing, and would need keeping in step
-- with a bill that has since been raised, edited, or never raised at all.
--
-- Shape: [{"userId": "user:10", "name": "Jay", "percent": 60}]
-- The rupee amounts are deliberately absent — the amount can still change before
-- the invoice goes out, and a stale figure here would look authoritative.
--
-- Safe to re-run.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS billing_shares JSONB;

COMMENT ON COLUMN tasks.billing_shares IS
  'The approver''s intended division of this task''s bill, as [{userId, name, percent}]. A draft for Accounts; the binding record is written onto the bill itself.';

DO $$
DECLARE
  n INTEGER;
BEGIN
  SELECT COUNT(*) INTO n FROM tasks WHERE billing_shares IS NOT NULL;
  RAISE NOTICE '';
  RAISE NOTICE 'tasks.billing_shares ready (% task(s) carry a division).', n;
  RAISE NOTICE 'Tasks approved before this show none, and Accounts fills it in as before.';
  RAISE NOTICE '';
END $$;
