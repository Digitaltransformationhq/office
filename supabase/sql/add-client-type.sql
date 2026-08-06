-- Marks the clients whose returns the firm does NOT file.
--
-- The "Non fillers" sheet of the ITR control list holds 250 real people the
-- office keeps on record — file number, PAN, portal password, phone, email —
-- but does not file a return for. They are clients in every sense that matters
-- to the client master; the one thing that differs is that no ITR is due from
-- this firm on their behalf.
--
-- So they belong in `clients` rather than a list of their own, but they must be
-- obvious at a glance. Mixed in unmarked, they would inflate every client count
-- and, worse, look like filing clients nobody had started work on.
--
-- Safe to re-run.

-- ============================================
-- CLIENT TYPE
-- ============================================
-- Deliberately separate from `status`, which answers a different question.
-- `status` is whether the relationship is live (Active / Inactive);
-- `client_type` is what the firm does for them. A non-filer is very much an
-- active client — the office holds their credentials and answers for them —
-- so collapsing the two would lose one fact or the other.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_type TEXT NOT NULL DEFAULT 'Filing';

-- Added separately from the column so re-running against a database that
-- already has the column still installs the constraint.
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_client_type_check;
ALTER TABLE clients ADD CONSTRAINT clients_client_type_check
  CHECK (client_type IN ('Filing', 'Non-filer'));

-- "Show me who is outstanding" filters on this constantly, and it is far more
-- selective than status: a few hundred non-filers against several thousand.
CREATE INDEX IF NOT EXISTS idx_clients_client_type ON clients(client_type);

DO $$
DECLARE
  filing INTEGER;
  nonfiler INTEGER;
BEGIN
  SELECT COUNT(*) INTO filing   FROM clients WHERE client_type = 'Filing';
  SELECT COUNT(*) INTO nonfiler FROM clients WHERE client_type = 'Non-filer';
  RAISE NOTICE '';
  RAISE NOTICE 'clients.client_type ready — % filing, % non-filer.', filing, nonfiler;
  RAISE NOTICE 'Next: run the import from scripts/import-itr-nonfilers.py.';
  RAISE NOTICE '';
END $$;
