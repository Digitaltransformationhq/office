-- How the client's data actually reached the office.
--
-- The register already records THAT data arrived. It does not record how, and
-- that turns out to be the question staff are asked most often once a return is
-- in motion: was it the hard copy the client dropped in, the WhatsApp photos, or
-- the Drive link the accountant sent? Answering it today means asking the person
-- who took it in, and hoping they remember.
--
-- A closed list rather than free text. Left open, this column would fill up with
-- 'whatsapp', 'Whatsapp', 'wa', 'on wtsp' and be worth nothing to count or
-- filter on, which is most of the reason for recording it at all.
--
-- Nullable, and no backfill. Nobody now knows how the data for the returns
-- already on the register arrived, and guessing a medium for 441 rows would put
-- invented facts next to real ones. Blank honestly means "not recorded".
--
-- Safe to re-run.

ALTER TABLE itr_filings ADD COLUMN IF NOT EXISTS data_medium TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'itr_filings_data_medium_check'
  ) THEN
    ALTER TABLE itr_filings ADD CONSTRAINT itr_filings_data_medium_check
      CHECK (data_medium IS NULL OR data_medium IN (
        'In person',              -- the client brought it to the office
        'Collected from client',  -- someone from the office went and fetched it
        'Courier / Post',
        'Email',
        'WhatsApp',
        'Cloud link',             -- Drive, Dropbox, a shared folder
        'Pen drive',              -- includes a Tally backup on a disk
        'Downloaded from portal', -- AIS / 26AS / TIS, pulled by the office
        'Other'
      ));
  END IF;
END $$;

-- Reading is always "how did this year's data come in", so the year leads.
CREATE INDEX IF NOT EXISTS idx_itr_filings_data_medium
  ON itr_filings(financial_year, data_medium)
  WHERE data_medium IS NOT NULL;

DO $$
DECLARE
  recorded INTEGER;
  awaiting INTEGER;
BEGIN
  SELECT COUNT(*) INTO recorded FROM itr_filings WHERE data_medium IS NOT NULL;
  SELECT COUNT(*) INTO awaiting FROM itr_filings WHERE status = 'Data Received' AND data_medium IS NULL;
  RAISE NOTICE '';
  RAISE NOTICE 'itr_filings.data_medium added.';
  RAISE NOTICE '  % return(s) already carry a medium', recorded;
  RAISE NOTICE '  % return(s) sit at Data Received with none recorded', awaiting;
  RAISE NOTICE '';
END $$;
