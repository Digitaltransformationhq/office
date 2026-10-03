-- Run after add-client-type.sql and add-gst-compliance-register.sql.
-- A discontinuation applies to the client, across their GST registrations.
BEGIN;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS gst_discontinued_fy INTEGER
  CHECK (gst_discontinued_fy BETWEEN 1900 AND 9998);

CREATE OR REPLACE FUNCTION public.mark_gst_client_discontinued()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  start_year INTEGER;
BEGIN
  IF NEW.status <> 'Discontinued' THEN RETURN NEW; END IF;
  IF NEW.financial_year !~ '^[0-9]{4}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'A valid financial year is required to discontinue a client';
  END IF;
  start_year := substring(NEW.financial_year FROM 1 FOR 4)::INTEGER;
  IF substring(NEW.financial_year FROM 6 FOR 2)::INTEGER <> (start_year + 1) % 100 THEN
    RAISE EXCEPTION 'Invalid financial year';
  END IF;
  -- Keep the earliest recorded discontinuation; saving another period must
  -- not extend the visibility window. Historical filing edits do not reactivate
  -- the client or remove the recorded discontinuation.
  UPDATE public.clients c
  SET client_type = 'Non-filer',
      gst_discontinued_fy = LEAST(COALESCE(c.gst_discontinued_fy, start_year), start_year)
  FROM public.client_gst_registrations r
  WHERE r.id = NEW.registration_id AND c.id = r.client_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mark_gst_client_discontinued ON public.gst_filings;
CREATE TRIGGER mark_gst_client_discontinued
  AFTER INSERT OR UPDATE OF status, financial_year, registration_id ON public.gst_filings
  FOR EACH ROW EXECUTE FUNCTION public.mark_gst_client_discontinued();

-- Bring previously discontinued clients into the same lifecycle.
UPDATE public.clients c
SET client_type = 'Non-filer',
    gst_discontinued_fy = LEAST(COALESCE(c.gst_discontinued_fy, d.start_year), d.start_year)
FROM (
  SELECT r.client_id, MIN(substring(f.financial_year FROM 1 FOR 4)::INTEGER) AS start_year
  FROM public.gst_filings f
  JOIN public.client_gst_registrations r ON r.id = f.registration_id
  WHERE f.status = 'Discontinued' AND f.financial_year ~ '^[0-9]{4}-[0-9]{2}$'
    AND substring(f.financial_year FROM 6 FOR 2)::INTEGER =
        (substring(f.financial_year FROM 1 FOR 4)::INTEGER + 1) % 100
  GROUP BY r.client_id
) d
WHERE c.id = d.client_id;

COMMIT;
