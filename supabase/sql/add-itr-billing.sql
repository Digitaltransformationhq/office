-- Hands a filed return to Accounts for billing, and lets Accounts hand it back.
--
--   ITR desk marks Filed ──> Pending  (automatic, no one has to remember)
--                              │
--                 Accounts ────┼──> Billed    bill number, date, acknowledgement
--                              │
--                              └──> Returned  with a reason, back to the ITR desk
--                                       │
--                                       └──> corrected and marked Filed again
--
-- Billing is tracked separately from `status` rather than as more statuses on it.
-- A return that has been filed IS filed; whether the invoice has gone out is a
-- different question with a different owner, and folding the two together would
-- mean un-billing a return by claiming it was never filed.
--
-- Safe to re-run.

ALTER TABLE itr_filings ADD COLUMN IF NOT EXISTS billing_status TEXT NOT NULL DEFAULT 'Not Ready';

ALTER TABLE itr_filings DROP CONSTRAINT IF EXISTS itr_filings_billing_status_check;
ALTER TABLE itr_filings ADD CONSTRAINT itr_filings_billing_status_check
  CHECK (billing_status IN ('Not Ready', 'Pending', 'Billed', 'Returned'));

COMMENT ON COLUMN itr_filings.billing_status IS
  'Not Ready until the return is filed, then Pending for Accounts, then Billed or Returned.';

-- Filled in by Accounts when the invoice is raised. bill_number and
-- acknowledgement_no already exist — they moved from the ITR desk's dialog to
-- this step, because the person raising the invoice is the one who has them.
ALTER TABLE itr_filings ADD COLUMN IF NOT EXISTS bill_date DATE;
ALTER TABLE itr_filings ADD COLUMN IF NOT EXISTS billing_remarks TEXT;
ALTER TABLE itr_filings ADD COLUMN IF NOT EXISTS billed_by_id TEXT;
ALTER TABLE itr_filings ADD COLUMN IF NOT EXISTS billed_by_name TEXT;
ALTER TABLE itr_filings ADD COLUMN IF NOT EXISTS billed_at TIMESTAMP WITH TIME ZONE;

-- Why Accounts sent it back. Kept after the return is corrected and re-filed:
-- the point of recording a mistake is that it can be looked at later, and
-- clearing it on resubmission would erase exactly that.
ALTER TABLE itr_filings ADD COLUMN IF NOT EXISTS returned_reason TEXT;
ALTER TABLE itr_filings ADD COLUMN IF NOT EXISTS returned_by_id TEXT;
ALTER TABLE itr_filings ADD COLUMN IF NOT EXISTS returned_by_name TEXT;
ALTER TABLE itr_filings ADD COLUMN IF NOT EXISTS returned_at TIMESTAMP WITH TIME ZONE;
-- How many times this return has come back. A third rejection of the same work
-- is worth a closer look than a first.
ALTER TABLE itr_filings ADD COLUMN IF NOT EXISTS return_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE itr_filings DROP CONSTRAINT IF EXISTS itr_filings_billed_by_fk;
ALTER TABLE itr_filings ADD CONSTRAINT itr_filings_billed_by_fk
  FOREIGN KEY (billed_by_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE itr_filings DROP CONSTRAINT IF EXISTS itr_filings_returned_by_fk;
ALTER TABLE itr_filings ADD CONSTRAINT itr_filings_returned_by_fk
  FOREIGN KEY (returned_by_id) REFERENCES users(id) ON DELETE SET NULL;

-- The two queues each side reads: Accounts wants Pending, the ITR desk wants
-- Returned. Both are a small slice of the table, so a partial index is enough.
CREATE INDEX IF NOT EXISTS idx_itr_filings_billing
  ON itr_filings(billing_status, financial_year)
  WHERE billing_status IN ('Pending', 'Returned');

-- ============================================
-- BACKFILL
-- ============================================
-- Returns already marked filed have never been through this, so they join the
-- queue where they would have been had it existed. Anything carrying a bill
-- number is treated as already billed rather than asking Accounts to raise an
-- invoice that exists — 191 rows came in from the control list that way.

UPDATE itr_filings
SET billing_status = CASE
      WHEN bill_number IS NOT NULL AND TRIM(bill_number) <> '' THEN 'Billed'
      ELSE 'Pending'
    END,
    updated_at = NOW()
WHERE status = 'Filed' AND billing_status = 'Not Ready';

DO $$
DECLARE
  pending INTEGER; billed INTEGER; notready INTEGER;
BEGIN
  SELECT COUNT(*) FILTER (WHERE billing_status = 'Pending'),
         COUNT(*) FILTER (WHERE billing_status = 'Billed'),
         COUNT(*) FILTER (WHERE billing_status = 'Not Ready')
    INTO pending, billed, notready FROM itr_filings;
  RAISE NOTICE '';
  RAISE NOTICE 'ITR billing ready — % pending with Accounts, % already billed, % not yet filed.',
    pending, billed, notready;
  RAISE NOTICE '';
END $$;
