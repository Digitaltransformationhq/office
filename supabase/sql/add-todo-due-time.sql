-- An optional time on a personal to-do.
--
-- The list is a paper pad on purpose — type a line, press Enter, nobody else
-- sees it. Most lines never want a date and are not improved by being asked for
-- one. But some of them are the reason the day has a shape: call the client back
-- at four, leave for the bank at half two. Those need to say so, and they need to
-- climb the list as the hour comes round rather than sitting wherever they were
-- typed.
--
-- So both columns are nullable and neither is ever required. A line with no time
-- behaves exactly as it always has: it sits in the order it was written and
-- rolls over until it is ticked.
--
-- Date AND time, not one or the other. A time with no date would mean "today"
-- forever — an item written on Monday for a Wednesday appointment would nag from
-- Monday and then, once Wednesday arrived, have no way to say so.
--
-- TIME, not a timestamp, for the same reason tasks.target_time is a TIME: four
-- o'clock is four o'clock, and an instant converted through UTC and back is how
-- it ends up displayed at half past ten. See supabase/sql/add-task-due-time.sql.
--
-- Safe to re-run.

ALTER TABLE personal_todos ADD COLUMN IF NOT EXISTS due_on DATE;
ALTER TABLE personal_todos ADD COLUMN IF NOT EXISTS due_time TIME;

COMMENT ON COLUMN personal_todos.due_on IS
  'Optional day this line is for. NULL = no particular day, as before.';
COMMENT ON COLUMN personal_todos.due_time IS
  'Optional time of day on due_on. NULL = that day with no particular hour.';

-- An hour with no day attached is not an appointment.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'personal_todos_due_time_needs_date') THEN
    ALTER TABLE personal_todos ADD CONSTRAINT personal_todos_due_time_needs_date
      CHECK (due_time IS NULL OR due_on IS NOT NULL);
  END IF;
END $$;

-- "What is coming up on my own list", for one owner. Partial: a ticked item is
-- not coming up, and the dated lines are a small slice of the table.
CREATE INDEX IF NOT EXISTS idx_personal_todos_due
  ON personal_todos(user_id, due_on ASC NULLS LAST, due_time ASC NULLS LAST)
  WHERE NOT done AND due_on IS NOT NULL;

DO $$
DECLARE
  dated INTEGER;
BEGIN
  SELECT COUNT(*) INTO dated FROM personal_todos WHERE due_on IS NOT NULL;
  RAISE NOTICE '';
  RAISE NOTICE 'personal_todos due date/time ready (% line(s) carry one).', dated;
  RAISE NOTICE 'Lines without one are untouched: no date, no nagging, same order as before.';
  RAISE NOTICE '';
END $$;
