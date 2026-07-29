-- Adds a comment thread to the task approval loop.
--
-- The flow this supports:
--
--   member marks work done  ──[submission note]──>  Pending Approval - Completion
--        ▲                                                     │
--        │                                          approver reads the thread
--   [resubmission note]                                        │
--        │                                    ┌────────────────┴────────────────┐
--        └──── In Progress <──[change_request note]──          ──[approval note]──> Pending for Billing
--
-- Every round leaves a row here, so the conversation survives any number of
-- send-backs. tasks.comments is a single free-text column with rejection lines
-- appended to it — it cannot say who wrote what, when, or at which round, which
-- is exactly what an approver needs before releasing work to Accounts.
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  -- Nullable, and paired with a denormalised name: a staff member leaving the
  -- firm must not erase the audit trail of why work was sent back.
  author_id TEXT,
  author_name TEXT NOT NULL,
  author_role TEXT,
  -- What the comment is, so the thread can be read at a glance:
  --   submission     — work handed over for approval (or handed back after changes)
  --   change_request — approver returning it with what needs fixing
  --   approval       — approver signing off, carried through to Accounts
  --   note           — anything else either side wants on the record
  kind TEXT NOT NULL DEFAULT 'note'
    CHECK (kind IN ('submission', 'change_request', 'approval', 'note')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

-- The thread is always read whole, in order, for one task.
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id, created_at);

-- ============================================
-- OPEN CHANGE REQUEST, DENORMALISED ONTO THE TASK
-- ============================================
-- The dashboards list every task in one call. Asking "is someone waiting on me
-- to fix this?" per row would mean a request per task, so the latest change
-- request is mirrored here. The full conversation still lives in task_comments;
-- these three columns only drive the banner.
--
-- changes_requested_at NULL means nothing is outstanding — it is cleared when
-- the work is resubmitted.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS changes_requested_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS changes_requested_by TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS changes_requested_note TEXT;

-- How many times this task has come back for changes. Shown to the approver as
-- context — a third resubmission of the same work is worth a closer read.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS revision_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tasks_changes_requested
  ON tasks(assigned_to_id, changes_requested_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
-- Matches every other table: reads and writes go through the edge function on
-- the service role key, never straight from the browser with the anon key.
-- See enable-rls-and-hash-passwords.sql.

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'task_comments created; tasks gained changes_requested_* + revision_count.';
  RAISE NOTICE '';
END $$;
