-- Adds the completion-approval stage to the task lifecycle.
--
-- New flow:
--   Pending -> In Progress -> [Mark Done] -> Pending Approval - Completion
--           -> [Approve]   -> Pending for Billing
--           -> [Mark Billed] -> Completed
--
-- 'Pending Approval' keeps its original meaning: a newly created task awaiting
-- a partner's sign-off before work starts. The two gates must stay distinct,
-- because approving a new task sends it to 'Pending' (go start it) while
-- approving a finished one sends it to 'Pending for Billing'. Sharing one
-- status would make an approved-complete task look un-started.
--
-- 'Billed' is retained in the constraint but is no longer written: the billing
-- step now lands on 'Completed'. Existing rows still holding 'Billed' stay
-- valid, so this migration needs no data backfill and can be re-run safely.

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
