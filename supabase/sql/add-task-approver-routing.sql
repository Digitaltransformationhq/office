-- Approver routing, and 'Billed' as the terminal status.
--
-- Run this AFTER add-completion-approval-status.sql. Safe to re-run.
--
-- Two creation flows now exist:
--
--   A. A partner/admin creates a task and assigns it. No creation approval is
--      needed — they are the authority. They become the task's approver, so the
--      completion approval comes back to them.
--
--   B. A member/leader creates their own task. It needs sign-off before work
--      starts. They may nominate an approver; if they leave it blank any
--      partner can pick it up, and whoever approves claims it for the rest of
--      the task's life.
--
-- Either way approver_id is who the completion approval goes to. Nothing
-- recorded this before: the UI has always sent approvedBy/approvedById/
-- approvedAt on approval and the server dropped them on the floor, so there was
-- no way to route anything back to a person.

-- Who the approval is routed to. NULL means "any partner may take it".
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approver_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approver_name TEXT;

-- Who actually signed it off, and when. Distinct from approver_id: the routing
-- target can be empty while this records the person who stepped in.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approved_by_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approved_by_name TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- ON DELETE SET NULL, not CASCADE: losing a partner must never delete the
-- firm's tasks. Guarded so re-running does not error on an existing constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_approver_id_fkey'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_approver_id_fkey
      FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_approver_id ON tasks(approver_id);

-- Existing tasks predate routing, so they stay NULL: any partner can approve
-- them. Backfilling them to their creator would hand approval rights to
-- whichever member happened to raise the task.

-- ── Terminal status ──────────────────────────────────────────────────────────
-- The lifecycle now ends at 'Billed':
--
--   Pending -> In Progress -> [Done] -> Pending Approval - Completion
--           -> [Approve + amount] -> Pending for Billing
--           -> [Mark Billed] -> Billed
--
-- 'Completed' is retired from the flow but kept in the constraint: rows already
-- carrying it stay valid and still render as finished work.
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN (
    'Pending',
    'In Progress',
    'Completed',
    'Overdue',
    'Pending Approval',
    'Pending Approval - Completion',
    'Pending for Billing',
    'Billed'
  ));
