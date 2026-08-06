-- The ITR register: replaces "ITR CONTROL LIST F.Y.<year>.xlsx".
--
--   clients                 one row per PAN  (already exists — no ITR client table)
--     └── itr_filings       one row per client per financial year
--
-- 89% of the control list is already in the client master. A separate table of
-- ITR clients would hold the same people twice: 77 PANs appear on both sheets,
-- typically under different names — the GST sheet names the business, the ITR
-- sheet names the proprietor — so they read as two people while being one. Every
-- change of address would then have to be made twice, or silently disagree.
--
-- Safe to re-run.

-- ============================================
-- ITR FILINGS
-- ============================================
-- One return, for one client, for one year. Unlike GST there is no per-period
-- fan-out: an ITR falls due once a year, so the financial year IS the period.

CREATE TABLE IF NOT EXISTS itr_filings (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  -- The year the return reports on, written as the office writes it: 2025-26.
  -- The assessment year is always the one after, so it is derived rather than
  -- stored — two fields that must agree are two fields that can disagree.
  financial_year TEXT NOT NULL,
  itr_form TEXT
    CHECK (itr_form IS NULL OR itr_form IN
      ('ITR-1', 'ITR-2', 'ITR-3', 'ITR-4', 'ITR-5', 'ITR-6', 'ITR-7')),

  -- The work ladder, derived from the sheet's own vocabulary:
  --
  --   Pending ─> Data Requested ─> Data Received ─> In Preparation ─> Ready to File ─> Filed
  --                    │                                                     │
  --                    └──> Data Not Provided                                └──> Not Applicable
  --
  -- 'Ready to File' is the sheet's RTF, which appears 63 times and is the single
  -- most common thing anyone writes in the STATUS column.
  status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Data Requested', 'Data Not Provided', 'Data Received',
                      'In Preparation', 'Ready to File', 'Filed', 'Not Applicable')),

  -- The two source columns, kept verbatim.
  --
  -- The DATA column holds 96 distinct free-text values — 'CALL DONE',
  -- 'ACCOUNTING', 'WP AND PHY', 'DONE F NEW 13.4 10.17AM'. `status` above is
  -- derived from them where the meaning is unambiguous, but the original text is
  -- never thrown away: a rule that covers 90% of the values would quietly lose
  -- the other 10%, and the person who typed it knew something the rule does not.
  data_note TEXT,
  status_note TEXT,
  partner_remark TEXT,

  -- 'Old' or 'New' tax regime, where the sheet says so ("DONE F NEW", "F OLD").
  regime TEXT CHECK (regime IS NULL OR regime IN ('Old', 'New')),

  -- Nullable even when status is 'Filed', which is the opposite of the rule on
  -- gst_filings. The GST sheet recorded a real date in every filed cell; this
  -- one has two rows that say only "DONE". Refusing them would either lose the
  -- fact that they are filed or invite someone to invent a date. The GST
  -- constraint stays as it is — it is enforceable there because the data
  -- supports it.
  filed_on DATE,
  acknowledgement_no TEXT,

  -- Audit cases file by 31 October rather than 31 July, so the deadline cannot
  -- be derived from the year alone.
  is_audit BOOLEAN DEFAULT FALSE,
  due_date DATE,

  -- The document checklist, straight off the sheet's last columns.
  cpc BOOLEAN DEFAULT FALSE,
  itr_v BOOLEAN DEFAULT FALSE,
  computation BOOLEAN DEFAULT FALSE,
  financial_statement BOOLEAN DEFAULT FALSE,
  challan BOOLEAN DEFAULT FALSE,

  -- Which WhatsApp group the client is chased in ("IT 1", "IT 2").
  wp_group TEXT,
  bill_number TEXT,

  -- Denormalised alongside the id, as everywhere else: the register must stay
  -- readable after a staff member leaves, and the id is nulled when they do.
  responsible_person_id TEXT,
  responsible_person_name TEXT,

  remarks TEXT,
  updated_by_id TEXT,
  updated_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (responsible_person_id) REFERENCES users(id) ON DELETE SET NULL,
  -- Makes the import idempotent and stops a client acquiring two returns for one
  -- year, which is the mistake a spreadsheet cannot prevent.
  UNIQUE (client_id, financial_year)
);

CREATE INDEX IF NOT EXISTS idx_itr_filings_year ON itr_filings(financial_year);
CREATE INDEX IF NOT EXISTS idx_itr_filings_client ON itr_filings(client_id, financial_year);
CREATE INDEX IF NOT EXISTS idx_itr_filings_person ON itr_filings(responsible_person_id, financial_year);
-- "What is still outstanding" — the question the sheet is scanned for.
CREATE INDEX IF NOT EXISTS idx_itr_filings_open ON itr_filings(financial_year, status)
  WHERE status NOT IN ('Filed', 'Not Applicable');

DROP TRIGGER IF EXISTS update_itr_filings_updated_at ON itr_filings;
CREATE TRIGGER update_itr_filings_updated_at
  BEFORE UPDATE ON itr_filings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CLIENT COLUMNS USED BY THE ITR SIDE
-- ============================================
-- itr_applicable already exists (see add-gst-compliance-register.sql) and is set
-- FALSE for the non-filers. The income-tax portal password is per client rather
-- than per year, so it sits here.
--
-- Same caveat as the GST portal credentials: held because the spreadsheet holds
-- them and the work cannot be done without them, excluded from list endpoints,
-- and with no per-role restriction yet. See docs/gst-compliance.md.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS itr_portal_password TEXT;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
-- Matches every other table: reads and writes go through the edge function on
-- the service role key, never straight from the browser with the anon key.

ALTER TABLE itr_filings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  n INTEGER;
BEGIN
  SELECT COUNT(*) INTO n FROM itr_filings;
  RAISE NOTICE '';
  RAISE NOTICE 'itr_filings ready (% row(s)).', n;
  RAISE NOTICE 'Next: run the import produced by scripts/import-itr-control-list.py.';
  RAISE NOTICE '';
END $$;
