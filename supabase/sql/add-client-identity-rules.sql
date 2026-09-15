-- PAN is the client's identity, and the database holds everyone to it.
--
-- The client master reached 1264 rows for 810 clients because three sources were
-- loaded with no shared key — an April list typed by name, then the GST and ITR
-- workbooks keyed on PAN — and because the app let anyone add a client with no
-- PAN at all. Nothing could match "Sanjiv Mishra" to "SANJEEV MISHRA (AUYPM3343G)",
-- so both lived on.
--
-- The rules, from strongest to softest:
--
--   1. PAN is unique                     already enforced by idx_clients_pan_unique
--   2. PAN must look like a PAN           ABCDE1234F — a GSTIN typed into the PAN
--                                         column is how ALLEGIANCE WATER was duplicated
--   3. No PAN needs a stated reason       so a missing PAN is a known gap to close,
--                                         never an accident nobody notices
--
-- Phone and name matches are warnings, not rules, and live in the edge function:
-- families share phone numbers and common names repeat, so the database cannot
-- tell a duplicate from a relative. A person can.
--
-- Safe to re-run.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS pan_missing_reason TEXT;

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_pan_missing_reason_check;
ALTER TABLE clients ADD CONSTRAINT clients_pan_missing_reason_check
  CHECK (pan_missing_reason IS NULL OR pan_missing_reason IN (
    'PAN awaited from client',   -- has one, not collected yet
    'Client has no PAN',          -- genuinely none (e.g. a minor, some trusts)
    'Foreign / non-resident entity'
  ));

-- Every client without a PAN today is one whose PAN was simply never recorded.
UPDATE clients SET pan_missing_reason = 'PAN awaited from client'
WHERE pan IS NULL AND pan_missing_reason IS NULL;

-- Once a PAN arrives the reason is history, not a second opinion.
UPDATE clients SET pan_missing_reason = NULL WHERE pan IS NOT NULL AND pan_missing_reason IS NOT NULL;

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_pan_format_check;
ALTER TABLE clients ADD CONSTRAINT clients_pan_format_check
  CHECK (pan IS NULL OR pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$');

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_pan_or_reason_check;
ALTER TABLE clients ADD CONSTRAINT clients_pan_or_reason_check
  CHECK (pan IS NOT NULL OR pan_missing_reason IS NOT NULL);

-- The "No PAN" filter on the client master.
CREATE INDEX IF NOT EXISTS idx_clients_pan_missing ON clients (pan_missing_reason) WHERE pan IS NULL;
