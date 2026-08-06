-- Triage for registrations backfilled from clients.gst but absent from the GST
-- workbook.
--
-- Two things happened when the register was first loaded:
--
--   1. add-gst-compliance-register.sql turned every non-empty clients.gst into a
--      registration. That is 103 rows.
--   2. The workbook import upserted its 136 rows on top, matching by GSTIN.
--
-- 36 backfilled rows were not in the workbook and so were never corrected. They
-- have no filings, no responsible person, and no real filing frequency — the
-- backfill assumed 'Monthly' because clients.gst carries no cycle. That assumed
-- frequency is the problem: it makes each of those rows claim twenty-four
-- deadlines a year that nobody is working, which inflates every count on the
-- compliance screen.
--
-- STEP 1 is a read. Run it, look at what comes back, then decide on steps 2-4.
-- Nothing below step 1 runs until you uncomment it.

-- ============================================
-- STEP 1 — LOOK AT THEM  (read only)
-- ============================================

SELECT
  r.id,
  r.gstin,
  r.trade_name,
  c.name AS client_name,
  c.pan,
  r.filing_frequency,
  r.status,
  -- Well-formed means 2 digits, 5 letters, 4 digits, a letter, then 3 more.
  -- Anything else is a note somebody typed into a GSTIN field.
  (r.gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]{3}$') AS gstin_looks_valid
FROM client_gst_registrations r
JOIN clients c ON c.id = r.client_id
WHERE NOT EXISTS (SELECT 1 FROM gst_filings f WHERE f.registration_id = r.id)
ORDER BY gstin_looks_valid, r.trade_name;

-- ============================================
-- STEP 2 — STOP THEM CLAIMING DEADLINES
-- ============================================
-- Turns the assumed 'Monthly' into 'Irregular' for every backfilled row that has
-- no filings. 'Irregular' means periods are added by hand, which is the truth
-- until someone sets a real frequency: the rows stay visible and editable, but
-- stop manufacturing obligations.
--
-- This touches nothing that came from the workbook — those all have filings.

-- UPDATE client_gst_registrations r
-- SET filing_frequency = 'Irregular'
-- WHERE r.filing_frequency = 'Monthly'
--   AND NOT EXISTS (SELECT 1 FROM gst_filings f WHERE f.registration_id = r.id);

-- ============================================
-- STEP 3 — REMOVE THE ONES THAT ARE NOT GSTINs
-- ============================================
-- Eight of the 36 hold something that is not a GST number at all: 'URD', 'RPL',
-- '24563247410', '13546842DASF'. These are notes and placeholders that ended up
-- in the clients.gst column over the years. They cannot be filed against.
--
-- Only the REGISTRATION is deleted — the client record is untouched, and so is
-- clients.gst itself. Check the step 1 output first; the guard on having no
-- filings means nothing with recorded work can be caught by this.

-- DELETE FROM client_gst_registrations r
-- WHERE r.gstin !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]{3}$'
--   AND NOT EXISTS (SELECT 1 FROM gst_filings f WHERE f.registration_id = r.id);

-- ============================================
-- STEP 4 — CLEAR THE SAMPLE DATA  [DONE 2026-08-04]
-- ============================================
-- schema.sql used to seed three demo clients (ABC Enterprises, XYZ Corporation,
-- PQR Industries) with placeholder GSTINs of the form 24XXXXX....
--
-- Already removed: all three had no tasks, documents, queries or filings, and
-- the seed itself has been taken out of schema.sql so re-running it cannot put
-- them back. Registrations went from 172 to 169.
--
-- Left here in case it has to run against another environment. The guards mean
-- it deletes nothing rather than the wrong thing if any of those ids were ever
-- reused for real work.

-- DELETE FROM client_gst_registrations r
-- WHERE r.client_id IN ('client:1', 'client:2', 'client:3')
--   AND r.gstin LIKE '24XXXXX%'
--   AND NOT EXISTS (SELECT 1 FROM gst_filings f WHERE f.registration_id = r.id);
--
-- DELETE FROM clients c
-- WHERE c.id IN ('client:1', 'client:2', 'client:3')
--   AND c.gst LIKE '24XXXXX%'
--   AND NOT EXISTS (SELECT 1 FROM documents d WHERE d.client_id = c.id)
--   AND NOT EXISTS (SELECT 1 FROM queries   q WHERE q.client_id = c.id)
--   AND NOT EXISTS (SELECT 1 FROM tasks     t WHERE t.client    = c.name)
--   AND NOT EXISTS (SELECT 1 FROM client_gst_registrations r WHERE r.client_id = c.id);

-- ============================================
-- STEP 5 — CONFIRM
-- ============================================

-- SELECT
--   (SELECT COUNT(*) FROM client_gst_registrations)                          AS registrations,
--   (SELECT COUNT(*) FROM client_gst_registrations r
--      WHERE NOT EXISTS (SELECT 1 FROM gst_filings f WHERE f.registration_id = r.id))
--                                                                            AS without_filings,
--   (SELECT COUNT(*) FROM client_gst_registrations WHERE filing_frequency = 'Monthly')
--                                                                            AS monthly;
