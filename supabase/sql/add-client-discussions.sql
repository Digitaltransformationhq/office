-- A dated record of what was discussed with a client.
--
-- The purpose is evidentiary: when a client says "I never told you that", the
-- firm can point to the day it was discussed and what was said. That purpose
-- drives two decisions this table would not otherwise make.
--
-- FIRST — entries are append-only.
--
-- There is no update path. A note that can be quietly rewritten afterwards
-- proves nothing: the value of "we discussed this on 5 August" rests entirely on
-- the record having been written then and not since altered. Corrections are
-- made by adding a further entry, exactly as a correction is made to a paper
-- file note. Only an admin may delete, and deleting is the only way to remove
-- anything.
--
-- SECOND — two dates, not one.
--
--   discussed_on  when the conversation happened
--   created_at    when it was written down
--
-- A note about a 5 August visit written on 5 August carries weight. The same
-- note written on 20 September, after the dispute arose, carries much less. One
-- date cannot express that, so both are kept and both are shown.
--
-- Held against the client rather than a return or a registration: a client is
-- one person who may have GST work and ITR work, and a conversation with them is
-- rarely about only one. The ITR desk should see what the GST desk was told.
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS client_discussions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,

  -- When it happened. Defaults to today, but can be back-dated at entry so a
  -- visit can be written up the following morning.
  discussed_on DATE NOT NULL DEFAULT CURRENT_DATE,

  -- How it happened. Kept short and closed: a free-text channel would end up
  -- holding 'phone', 'Phone', 'call', 'called' and be useless to filter on.
  mode TEXT NOT NULL DEFAULT 'In person'
    CHECK (mode IN ('In person', 'Phone', 'WhatsApp', 'Email', 'Video call', 'Other')),

  -- What was discussed. The record itself.
  note TEXT NOT NULL,

  -- Who else was there, where the client sent someone or brought someone.
  participants TEXT,

  -- Anything the client is to do, or the firm is. Not a task — this is a note of
  -- what was agreed, and it stays readable even if no task is ever raised.
  follow_up TEXT,

  -- Denormalised alongside the id, as elsewhere: a record kept for evidence must
  -- still name its author after that person has left the firm.
  recorded_by_id TEXT,
  recorded_by_name TEXT NOT NULL,

  -- When it was written down. Never updated — see the note above about why the
  -- gap between this and discussed_on matters.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by_id) REFERENCES users(id) ON DELETE SET NULL
);

-- The thread is always read whole, newest first, for one client.
CREATE INDEX IF NOT EXISTS idx_client_discussions_client
  ON client_discussions(client_id, discussed_on DESC, created_at DESC);

-- "Who have we not spoken to in a while" reads across clients by date.
CREATE INDEX IF NOT EXISTS idx_client_discussions_date
  ON client_discussions(discussed_on DESC);

-- Deliberately NO updated_at column and NO update trigger. The absence is the
-- point: there is nothing to update.

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
-- Matches every other table: reads and writes go through the edge function on
-- the service role key, never straight from the browser with the anon key.

ALTER TABLE client_discussions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  n INTEGER;
BEGIN
  SELECT COUNT(*) INTO n FROM client_discussions;
  RAISE NOTICE '';
  RAISE NOTICE 'client_discussions ready (% row(s)).', n;
  RAISE NOTICE 'Append-only: entries are added and, by an admin, deleted — never edited.';
  RAISE NOTICE '';
END $$;
