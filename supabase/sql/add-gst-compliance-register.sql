-- The GST compliance register: replaces "GST Report 2026-27.xlsx".
--
-- The shape the spreadsheet actually has, made explicit:
--
--   clients                     one row per PAN  (the unique client code)
--     └── client_gst_registrations   one row per GSTIN  (the sub-code)
--           └── gst_filings          one row per return per period
--
-- The spreadsheet is one row per GSTIN with twelve month-pairs across it
-- (GSTR-1 / GSTR-3B). That layout cannot hold a second registration for the same
-- PAN without repeating the client, cannot record when data arrived as well as
-- when the return was filed, and has to be rebuilt from scratch every financial
-- year. Splitting the periods into their own rows fixes all three.
--
-- Safe to re-run.

-- ============================================
-- CLIENT COLUMNS
-- ============================================
-- Declared only in archive/database-client-fees-update.sql, so an environment
-- built from schema.sql never had them — and every one is written by the
-- Add/Edit Client form.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS pan TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS file_number TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS firm_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS mobile_number TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email_id TEXT;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS itr_fees DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS gst_fees DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS gst_annual_return_fees DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS accounting_fees DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS audit_fees DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_act_fees DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tds_fees DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pf_esic_pt_labour_fees DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS consultancy_fees DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS total_fees DECIMAL(10, 2) DEFAULT 0;

-- Whether an ITR is due for this PAN at all. One return per financial year, so
-- this is a flag on the client. GST needs a table of its own because the number
-- of registrations — and therefore of returns — varies per client.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS itr_applicable BOOLEAN DEFAULT TRUE;

-- The Add Client form only ever required a name, but both of these were
-- NOT NULL — so saving a client without an industry failed at the database and
-- the form reported it as a generic failure.
ALTER TABLE clients ALTER COLUMN industry DROP NOT NULL;
ALTER TABLE clients ALTER COLUMN contact DROP NOT NULL;

-- ============================================
-- PAN AS THE UNIQUE CLIENT CODE
-- ============================================
-- Normalise before enforcing: PAN gets pasted with stray case and whitespace, so
-- 'abcde1234f ' and 'ABCDE1234F' must collide rather than both be stored.

UPDATE clients SET pan = UPPER(TRIM(pan)) WHERE pan IS NOT NULL AND pan <> UPPER(TRIM(pan));
UPDATE clients SET pan = NULL WHERE pan = '';

-- Partial, so the clients with no PAN recorded yet do not collide with each
-- other on NULL. Creating the index outright would abort the whole migration on
-- pre-existing duplicates, so duplicates are reported instead and the index goes
-- in on the next run once they are cleaned up.
DO $$
DECLARE
  dup_count INTEGER;
  dup_list TEXT;
BEGIN
  SELECT COUNT(*), STRING_AGG(pan, ', ')
    INTO dup_count, dup_list
    FROM (SELECT pan FROM clients WHERE pan IS NOT NULL GROUP BY pan HAVING COUNT(*) > 1) d;

  IF COALESCE(dup_count, 0) > 0 THEN
    RAISE NOTICE 'PAN uniqueness NOT enforced: % duplicate PAN(s) -> %', dup_count, dup_list;
    RAISE NOTICE 'Merge or correct those clients, then re-run this script.';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_pan_unique ON clients (pan) WHERE pan IS NOT NULL;
    RAISE NOTICE 'PAN uniqueness enforced.';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clients_file_number ON clients(file_number);

-- ============================================
-- GST REGISTRATIONS
-- ============================================
-- One row per GSTIN. A GSTIN embeds its own PAN in characters 3-12 and is unique
-- nationally, so it is the natural key and is enforced as one — the same
-- registration cannot end up filed under two different clients by accident.

CREATE TABLE IF NOT EXISTS client_gst_registrations (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  -- The office's own code for this registration ("167", "DNG-BHV", "TSSPL").
  -- Free text on purpose: the existing codes are not all numeric.
  code_no TEXT,
  gstin TEXT NOT NULL UNIQUE,
  -- Which branch or vertical, for the PANs holding more than one registration.
  trade_name TEXT,
  state TEXT,
  -- The 'M /Q' column. 'Composition' dealers file GSTR-4 annually instead of
  -- GSTR-1/3B, which is why it belongs in the same enum rather than as a flag —
  -- it changes which returns exist, not just how often.
  filing_frequency TEXT NOT NULL DEFAULT 'Monthly'
    CHECK (filing_frequency IN ('Monthly', 'Quarterly', 'Composition', 'Annual', 'Irregular', 'Not Applicable')),
  -- Denormalised alongside the id: the register has to stay readable after a
  -- staff member leaves, and the id is set to NULL when they do.
  responsible_person_id TEXT,
  responsible_person_name TEXT,
  billing_frequency TEXT
    CHECK (billing_frequency IS NULL OR billing_frequency IN ('Monthly', 'Quarter', 'Half Year', 'Annual', 'NA')),
  -- GST portal credentials. Held here because they are held in the spreadsheet
  -- today and the work cannot be done without them — but they are excluded from
  -- the list endpoint and only served on an explicit single-registration fetch.
  -- See docs/gst-compliance.md before widening access to them.
  portal_user_id TEXT,
  portal_password TEXT,
  contact_person TEXT,
  mobile_number TEXT,
  email_id TEXT,
  -- Ledger balances as last checked on the portal. A snapshot, not a running
  -- account — the portal remains the authority.
  cash_ledger DECIMAL(14, 2) DEFAULT 0,
  credit_ledger DECIMAL(14, 2) DEFAULT 0,
  reclaimed_amount DECIMAL(14, 2) DEFAULT 0,
  ledger_checked_on DATE,
  registration_date DATE,
  -- A cancelled registration stops accruing returns but stays on record: the
  -- periods already filed under it still have to be auditable.
  status TEXT NOT NULL DEFAULT 'Active'
    CHECK (status IN ('Active', 'Suspended', 'Cancelled')),
  cancellation_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (responsible_person_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_gst_registrations_client ON client_gst_registrations(client_id);
CREATE INDEX IF NOT EXISTS idx_gst_registrations_status ON client_gst_registrations(status);
CREATE INDEX IF NOT EXISTS idx_gst_registrations_person ON client_gst_registrations(responsible_person_id);

-- ============================================
-- GST FILINGS
-- ============================================
-- One row per (registration, return, period) — the cell of the spreadsheet,
-- unpacked so it can hold more than a single value.
--
-- The status ladder is taken from the markers already in use in the sheet:
--
--   Pending ──> Message Sent ──> Data Received ──> Challan Sent ──> Filed
--      │             │                 │
--      │             └──> Data Not Provided        └──> OTP Awaited
--      └──> Not Applicable                         └──> Nil
--
-- 'Filed' is the only status that carries a date the office is accountable for,
-- so filed_on is required with it and forbidden without it.

CREATE TABLE IF NOT EXISTS gst_filings (
  id TEXT PRIMARY KEY,
  registration_id TEXT NOT NULL,
  return_type TEXT NOT NULL
    CHECK (return_type IN ('GSTR-1', 'GSTR-3B', 'GSTR-4', 'GSTR-9', 'GSTR-9C', 'CMP-08', 'Other')),
  -- Indian financial year, April to March, written as the sheet names it.
  financial_year TEXT NOT NULL,
  -- Sortable and stable, so a period can be addressed without parsing a label:
  -- '2026-04' monthly, '2026-27-Q1' quarterly, '2026-27' annual.
  period_key TEXT NOT NULL,
  -- What a person reads: "APRIL'26", "Q1 2026-27", "FY 2026-27".
  period_label TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Message Sent', 'Data Not Provided', 'Data Received',
                      'OTP Awaited', 'Challan Sent', 'Nil', 'Filed', 'Not Applicable')),
  -- The half of the cell the spreadsheet could never record: a date cell says
  -- when it was filed but not when the data came in, so there was no way to see
  -- how long a return sat waiting.
  data_received_on DATE,
  filed_on DATE,
  arn TEXT,
  -- Who last moved it, for the same reason task comments carry an author.
  updated_by_id TEXT,
  updated_by_name TEXT,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (registration_id) REFERENCES client_gst_registrations(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by_id) REFERENCES users(id) ON DELETE SET NULL,
  -- Makes period generation and the Excel import idempotent: re-running either
  -- updates the existing cell instead of creating a duplicate beside it.
  UNIQUE (registration_id, return_type, period_key)
);

-- 'Filed' without a date is the one state that would quietly corrupt the
-- register — it reads as done while leaving nothing to prove when.
ALTER TABLE gst_filings DROP CONSTRAINT IF EXISTS gst_filings_filed_on_required;
ALTER TABLE gst_filings ADD CONSTRAINT gst_filings_filed_on_required
  CHECK ((status = 'Filed' AND filed_on IS NOT NULL) OR (status <> 'Filed' AND filed_on IS NULL));

-- The grid reads one financial year at a time, ordered by period.
CREATE INDEX IF NOT EXISTS idx_gst_filings_year ON gst_filings(financial_year, period_key);
CREATE INDEX IF NOT EXISTS idx_gst_filings_registration ON gst_filings(registration_id, financial_year);
-- "What is still outstanding" — the question the spreadsheet is scanned for.
CREATE INDEX IF NOT EXISTS idx_gst_filings_open ON gst_filings(status, due_date)
  WHERE status NOT IN ('Filed', 'Not Applicable');

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS update_gst_registrations_updated_at ON client_gst_registrations;
CREATE TRIGGER update_gst_registrations_updated_at
  BEFORE UPDATE ON client_gst_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gst_filings_updated_at ON gst_filings;
CREATE TRIGGER update_gst_filings_updated_at
  BEFORE UPDATE ON gst_filings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- BACKFILL FROM clients.gst
-- ============================================
-- Any GSTIN already on a client record becomes that client's first registration.
-- Ids are derived from the client id rather than generated, so re-running cannot
-- produce a second copy of the same row.
--
-- Backfilled rows come in as 'Irregular', not 'Monthly'. clients.gst records
-- that a GSTIN exists and nothing else — no cycle, no responsible person, no
-- history. Calling that monthly would assert twenty-four deadlines a year for a
-- registration nobody has said anything about, and the register would open
-- showing work that does not exist. 'Irregular' means "periods are added by
-- hand", which is exactly what is true until someone sets the frequency.
--
-- Registrations that ARE in the GST workbook get their real frequency a moment
-- later, when the import upserts over these rows on the GSTIN.

INSERT INTO client_gst_registrations (id, client_id, gstin, trade_name, filing_frequency, status)
SELECT 'gstreg:' || c.id, c.id, UPPER(TRIM(c.gst)), c.name, 'Irregular', 'Active'
FROM clients c
WHERE c.gst IS NOT NULL AND TRIM(c.gst) <> ''
ON CONFLICT DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
-- Matches every other table: reads and writes go through the edge function on
-- the service role key, never straight from the browser with the anon key.
-- See enable-rls-and-hash-passwords.sql.

ALTER TABLE client_gst_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gst_filings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  reg_count INTEGER;
  fil_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO reg_count FROM client_gst_registrations;
  SELECT COUNT(*) INTO fil_count FROM gst_filings;
  RAISE NOTICE '';
  RAISE NOTICE 'client_gst_registrations ready (% row(s)).', reg_count;
  RAISE NOTICE 'gst_filings ready (% row(s)).', fil_count;
  RAISE NOTICE 'Next: run the import produced by scripts/import-gst-report.py.';
  RAISE NOTICE '';
END $$;
