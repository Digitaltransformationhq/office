-- Run after add-gst-compliance-register.sql, before deploying the updated server/UI.
BEGIN;

-- NULL means a legacy client whose services must be inferred from their fees.
-- An explicit empty array means no services selected; zero-fee selections persist.
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS selected_services TEXT[];

CREATE OR REPLACE FUNCTION public.ensure_client_gst_registration()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  code TEXT := NULLIF(regexp_replace(upper(NEW.gst), '\s', '', 'g'), '');
  regular_service BOOLEAN;
  annual_service BOOLEAN;
  owner_id TEXT;
BEGIN
  regular_service := CASE WHEN NEW.selected_services IS NULL
    THEN COALESCE(NEW.gst_fees, 0) > 0 ELSE 'gstFees' = ANY(NEW.selected_services) END;
  annual_service := CASE WHEN NEW.selected_services IS NULL
    THEN COALESCE(NEW.gst_annual_return_fees, 0) > 0 ELSE 'gstAnnualReturnFees' = ANY(NEW.selected_services) END;
  IF NOT (regular_service OR annual_service) THEN RETURN NEW; END IF;
  IF code IS NULL OR code !~ '^[0-9]{2}[A-Z0-9]{10}[0-9A-Z]{3}$' THEN
    -- Legacy/imported records may lack a GSTIN; do not fabricate a registration.
    IF NEW.selected_services IS NOT NULL THEN
      RAISE EXCEPTION 'Enter a valid GSTIN for the selected GST service';
    END IF;
    RETURN NEW;
  END IF;

  -- The client and registration commit together. Never overwrite filing history,
  -- frequency, credentials or a suspended/cancelled registration on a client edit.
  INSERT INTO public.client_gst_registrations
    (id, client_id, gstin, trade_name, filing_frequency, status)
  VALUES ('gstreg:' || code, NEW.id, code, COALESCE(NULLIF(NEW.firm_name, ''), NEW.name),
    CASE WHEN regular_service THEN 'Monthly' ELSE 'Annual' END, 'Active')
  ON CONFLICT (gstin) DO NOTHING;

  SELECT client_id INTO owner_id FROM public.client_gst_registrations WHERE gstin = code;
  IF owner_id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'GSTIN % already belongs to another client', code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_client_gst_registration ON public.clients;
CREATE TRIGGER ensure_client_gst_registration
  AFTER INSERT OR UPDATE OF gst, selected_services, gst_fees, gst_annual_return_fees
  ON public.clients FOR EACH ROW EXECUTE FUNCTION public.ensure_client_gst_registration();

-- Repair already-saved clients with a GST service and a usable GSTIN.
-- Conflicting ownership is left for review, and existing registrations are preserved.
INSERT INTO public.client_gst_registrations
  (id, client_id, gstin, trade_name, filing_frequency, status)
SELECT 'gstreg:' || normalized.code, c.id, normalized.code,
  COALESCE(NULLIF(c.firm_name, ''), c.name),
  CASE WHEN (c.selected_services IS NULL AND COALESCE(c.gst_fees, 0) > 0)
    OR 'gstFees' = ANY(c.selected_services) THEN 'Monthly' ELSE 'Annual' END, 'Active'
FROM public.clients c
CROSS JOIN LATERAL (SELECT regexp_replace(upper(c.gst), '\s', '', 'g') AS code) normalized
WHERE normalized.code ~ '^[0-9]{2}[A-Z0-9]{10}[0-9A-Z]{3}$'
  AND ((c.selected_services IS NULL AND (COALESCE(c.gst_fees, 0) > 0 OR COALESCE(c.gst_annual_return_fees, 0) > 0))
    OR c.selected_services && ARRAY['gstFees', 'gstAnnualReturnFees'])
ORDER BY c.id
ON CONFLICT DO NOTHING;

COMMIT;
