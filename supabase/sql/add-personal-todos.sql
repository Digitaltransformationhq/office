-- A private daily list, one per person.
--
-- Deliberately NOT part of tasks, and deliberately not part of the calendar.
--
-- Tasks are firm work: assigned by somebody, approved, billed, counted on the
-- MIS. The moment a private note becomes one of those it is something a partner
-- can read and a report can total, and people stop writing the honest list and
-- go back to the diary on their desk. The separation is what makes this get used.
--
-- The calendar is a shared noticeboard of due dates, birthdays and holidays,
-- admin-only and owned by nobody. Personal items in there would be visible to
-- everyone who opened it.
--
-- So: its own table, one owner, nothing shared.
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS personal_todos (
  id TEXT PRIMARY KEY,

  -- The owner, and the only person who ever sees it.
  user_id TEXT NOT NULL,

  -- The line, as typed. No title/description split: this is a scribble, and
  -- asking for two fields is how a list stops being quick enough to bother with.
  body TEXT NOT NULL,

  done BOOLEAN NOT NULL DEFAULT FALSE,

  /*
   * The day it was ticked, as the OWNER's calendar reckons it — not the server's.
   *
   * A ticked item stays on the list until the end of the day, so you can see
   * what you got through. Deriving that from a UTC timestamp would clear it at
   * 5:30 in the morning IST and, worse, would file anything ticked after 5:30am
   * under the wrong day. The client sends its own local date; only it knows what
   * "today" means to the person looking at the screen.
   */
  done_on DATE,
  -- The exact moment, kept for ordering within a day.
  done_at TIMESTAMP WITH TIME ZONE,

  -- Manual order within the list. Items are added at the bottom, so the thing
  -- you have been putting off keeps its place at the top rather than being
  -- quietly buried by everything typed since.
  position INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- A ticked item without a date could never be cleared from the list, and a date
-- on an unticked one would be a lie about work not yet done.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'personal_todos_done_on_required') THEN
    ALTER TABLE personal_todos ADD CONSTRAINT personal_todos_done_on_required
      CHECK ((done AND done_on IS NOT NULL) OR (NOT done AND done_on IS NULL));
  END IF;
END $$;

-- Every read is "this person's list", in order.
CREATE INDEX IF NOT EXISTS idx_personal_todos_owner
  ON personal_todos(user_id, done, position);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
-- As everywhere else: no policies, no direct browser access. Reads and writes go
-- through the edge function, which scopes every query to one owner.

ALTER TABLE personal_todos ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  n INTEGER;
BEGIN
  SELECT COUNT(*) INTO n FROM personal_todos;
  RAISE NOTICE '';
  RAISE NOTICE 'personal_todos ready (% row(s)).', n;
  RAISE NOTICE 'Private per user. Open items roll over; ticked ones clear at the end of the owner''s day.';
  RAISE NOTICE '';
END $$;
