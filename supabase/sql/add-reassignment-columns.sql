-- Makes task reassignment work at all.
--
-- Run this in the Supabase SQL editor. Safe to re-run.
--
-- THE PROBLEM
--
-- The reassign flow writes assignment_status, reassigned_from_id/name,
-- originally_assigned_by_id/name and reassigned_at. None of those columns exist
-- in this database, so every "Reassign Task" fails on the UPDATE. The feature
-- has never worked here: the UI, the Accept/Reject buttons and the Pending
-- Acceptance state are all present in the code and unreachable in practice.
--
-- The DDL existed only in archive/database-task-reassignment-update.sql, an
-- archived one-off that was evidently never run against this project — the same
-- drift that left notifications and push_subscriptions undeclared in schema.sql.
--
-- Column meanings:
--   assignment_status           Pending Acceptance -> Accepted / Rejected.
--                               Defaults to Accepted so the 47 existing tasks
--                               stay workable rather than freezing as if they
--                               were mid-handover.
--   reassigned_from_*           Who handed it over, so a rejection can be
--                               routed back and the right people notified.
--   originally_assigned_by_*    The first assignee, kept across later moves.
--   rejection_reason            Why it was refused. The edge function currently
--                               folds this into comments as well.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS originally_assigned_by_id TEXT,
  ADD COLUMN IF NOT EXISTS originally_assigned_by_name TEXT,
  ADD COLUMN IF NOT EXISTS reassigned_from_id TEXT,
  ADD COLUMN IF NOT EXISTS reassigned_from_name TEXT,
  ADD COLUMN IF NOT EXISTS assignment_status TEXT DEFAULT 'Accepted',
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS reassigned_at TIMESTAMP WITH TIME ZONE;

-- Added separately and guarded: ADD COLUMN IF NOT EXISTS carries the CHECK with
-- it, so re-running after the column exists would otherwise skip the constraint
-- entirely and leave the values unvalidated.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_assignment_status_check'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_assignment_status_check
      CHECK (assignment_status IN ('Pending Acceptance', 'Accepted', 'Rejected'));
  END IF;
END $$;

-- Existing rows predate the column and come back NULL, which the UI reads as
-- "no handover in progress" — correct, but explicit is better than relying on
-- every read site defaulting the same way.
UPDATE tasks SET assignment_status = 'Accepted' WHERE assignment_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_assignment_status ON tasks(assignment_status);
