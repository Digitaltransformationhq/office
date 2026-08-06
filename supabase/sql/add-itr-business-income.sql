-- Business income drives the ITR due date.
--
-- The deadline for a return is not one date. As the office applies it:
--
--   audit case                                              31 October
--   business income, other than speculation or F&O          31 August
--   everything else                                         31 July
--
-- Audit wins where both apply, being the later and the stricter test.
--
-- This replaces `regime` in the dialog. The regime column itself stays: the
-- control list records it ("DONE F NEW", "F OLD") and that is real history, but
-- it does not affect a deadline and so has no place on a screen about what is
-- due when.
--
-- Safe to re-run.

ALTER TABLE itr_filings ADD COLUMN IF NOT EXISTS business_income BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN itr_filings.business_income IS
  'Business income other than speculation or F&O. TRUE moves the due date to 31 August.';

-- Deliberately NOT derived from itr_form. ITR-3 and ITR-4 are the business
-- income forms, but the exclusion the office cares about — speculation and F&O —
-- is not something the form number can answer, and a wrong deadline is worse
-- than an unset flag. It defaults FALSE and is set per return.

-- ============================================
-- BRING STORED DUE DATES INTO LINE
-- ============================================
-- due_date is stored per row so it can be overridden, which means the rule
-- change has to be applied to what is already there. Rows are recomputed from
-- their own flags, so an audit case keeps 31 October.

UPDATE itr_filings f
SET due_date = MAKE_DATE(
      (SPLIT_PART(f.financial_year, '-', 1))::INT + 1,
      CASE WHEN f.is_audit THEN 10 WHEN f.business_income THEN 8 ELSE 7 END,
      CASE WHEN f.is_audit THEN 31 WHEN f.business_income THEN 31 ELSE 31 END),
    updated_at = NOW()
WHERE f.financial_year ~ '^\d{4}-\d{2}$';

DO $$
DECLARE
  jul INTEGER; aug INTEGER; oct INTEGER;
BEGIN
  SELECT COUNT(*) FILTER (WHERE EXTRACT(MONTH FROM due_date) = 7),
         COUNT(*) FILTER (WHERE EXTRACT(MONTH FROM due_date) = 8),
         COUNT(*) FILTER (WHERE EXTRACT(MONTH FROM due_date) = 10)
    INTO jul, aug, oct
    FROM itr_filings;
  RAISE NOTICE '';
  RAISE NOTICE 'itr_filings.business_income ready.';
  RAISE NOTICE 'Due dates: % on 31 Jul, % on 31 Aug, % on 31 Oct.', jul, aug, oct;
  RAISE NOTICE '';
END $$;
