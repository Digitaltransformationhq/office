BEGIN;

-- Service changes are reviewed separately from ordinary client-detail edits.
-- That keeps even an administrator from adding/removing a service without the
-- fee and desk impact being reviewed first.
ALTER TABLE public.approval_routing_rules
  DROP CONSTRAINT IF EXISTS approval_routing_rules_action_key_check;
ALTER TABLE public.approval_routing_rules
  ADD CONSTRAINT approval_routing_rules_action_key_check
  CHECK (action_key IN ('client.create', 'client.update', 'client.services'));

INSERT INTO public.approval_routing_rules
  (action_key, label, enabled, approver_id, approver_name)
SELECT 'client.services', 'Change client services', TRUE, u.id, u.name
FROM public.users u
WHERE lower(u.name) LIKE '%brijesh%pitroda%'
  AND lower(u.role) = 'partner'
  AND u.status = 'Active'
ORDER BY u.created_at ASC
LIMIT 1
ON CONFLICT (action_key) DO UPDATE SET
  label = EXCLUDED.label,
  enabled = TRUE,
  approver_id = EXCLUDED.approver_id,
  approver_name = EXCLUDED.approver_name,
  updated_at = NOW();

-- Some imported clients have their valid GSTIN only in the registration table,
-- while clients.gst is blank. The older trigger rejected any selected_services
-- update for those clients. An existing registration is sufficient evidence;
-- genuinely new GST selections must still supply a valid GSTIN.
CREATE OR REPLACE FUNCTION public.ensure_client_gst_registration()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  code TEXT := NULLIF(regexp_replace(upper(NEW.gst), '\s', '', 'g'), '');
  regular_service BOOLEAN;
  annual_service BOOLEAN;
  owner_id TEXT;
BEGIN
  regular_service := 'gstFees' = ANY(COALESCE(NEW.selected_services, '{}'::text[]));
  annual_service := 'gstAnnualReturnFees' = ANY(COALESCE(NEW.selected_services, '{}'::text[]));
  IF NOT (regular_service OR annual_service) THEN RETURN NEW; END IF;

  IF code IS NULL OR code !~ '^[0-9]{2}[A-Z0-9]{10}[0-9A-Z]{3}$' THEN
    IF EXISTS (
      SELECT 1 FROM public.client_gst_registrations
      WHERE client_id = NEW.id AND status <> 'Cancelled'
    ) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Enter a valid GSTIN for the selected GST service';
  END IF;

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

-- Existing fee columns are all zero in the live client master. Reconstruct the
-- services only from operational records that prove the desk already handles
-- the client. Existing explicit selections are always preserved.
WITH evidence AS (
  SELECT client_id, array_agg(DISTINCT service_key ORDER BY service_key) AS services
  FROM (
    SELECT DISTINCT client_id, 'itrFees'::text AS service_key
    FROM public.itr_filings

    UNION ALL

    SELECT DISTINCT client_id, 'gstFees'::text
    FROM public.client_gst_registrations
    WHERE status <> 'Cancelled'

    UNION ALL

    SELECT DISTINCT r.client_id, 'gstAnnualReturnFees'::text
    FROM public.gst_filings f
    JOIN public.client_gst_registrations r ON r.id = f.registration_id
    WHERE f.return_type IN ('GSTR-4', 'GSTR-9', 'GSTR-9C')
  ) proven
  GROUP BY client_id
)
UPDATE public.clients c
SET selected_services = ARRAY(
      SELECT DISTINCT service
      FROM unnest(COALESCE(c.selected_services, '{}'::text[]) || COALESCE(e.services, '{}'::text[])) service
      ORDER BY service
    ),
    updated_at = NOW()
FROM evidence e
WHERE e.client_id = c.id;

UPDATE public.clients
SET selected_services = '{}'::text[]
WHERE selected_services IS NULL;

ALTER TABLE public.clients
  ALTER COLUMN selected_services SET DEFAULT '{}'::text[],
  ALTER COLUMN selected_services SET NOT NULL;

ALTER TABLE public.accounting_control_items
  ADD COLUMN IF NOT EXISTS client_id TEXT;

ALTER TABLE public.accounting_control_items
  DROP CONSTRAINT IF EXISTS accounting_control_items_client_id_fkey;
ALTER TABLE public.accounting_control_items
  ADD CONSTRAINT accounting_control_items_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounting_control_client_year
  ON public.accounting_control_items (financial_year, client_id)
  WHERE client_id IS NOT NULL;

-- Attach only exact normalised names (including firm names), and only where the
-- match is unique. Similar-looking clients are deliberately left for a person
-- to resolve; a false service assignment is worse than an unattached legacy row.
WITH possible AS (
  SELECT a.id AS item_id, c.id AS client_id,
         count(*) OVER (PARTITION BY a.id) AS match_count
  FROM public.accounting_control_items a
  JOIN public.clients c ON
    regexp_replace(lower(a.party_name), '[^a-z0-9]', '', 'g') =
      regexp_replace(lower(c.name), '[^a-z0-9]', '', 'g')
    OR (
      NULLIF(c.firm_name, '') IS NOT NULL AND
      regexp_replace(lower(a.party_name), '[^a-z0-9]', '', 'g') =
        regexp_replace(lower(c.firm_name), '[^a-z0-9]', '', 'g')
    )
), unique_matches AS (
  SELECT item_id, client_id FROM possible WHERE match_count = 1
)
UPDATE public.accounting_control_items a
SET client_id = m.client_id,
    updated_at = NOW()
FROM unique_matches m
WHERE a.id = m.item_id AND a.client_id IS NULL;

UPDATE public.clients c
SET selected_services = ARRAY(
      SELECT DISTINCT service
      FROM unnest(c.selected_services || ARRAY['accountingFees']::text[]) service
      ORDER BY service
    ),
    updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM public.accounting_control_items a WHERE a.client_id = c.id
);

-- A newly approved Accounting service gets a control row automatically. A
-- removal keeps its historic ticks/remarks but the API hides it from the live
-- register; re-approval therefore restores the same record rather than erasing
-- the desk's history.
CREATE OR REPLACE FUNCTION public.sync_accounting_control_item()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  next_particular INTEGER;
BEGIN
  IF 'accountingFees' = ANY(NEW.selected_services)
     AND NOT ('accountingFees' = ANY(COALESCE(NEW.discontinued_services, '{}'::text[]))) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.accounting_control_items
      WHERE financial_year = '2026-27' AND client_id = NEW.id
    ) THEN
      PERFORM pg_advisory_xact_lock(2026102401);
      SELECT COALESCE(MAX(particulars), 0) + 1 INTO next_particular
      FROM public.accounting_control_items
      WHERE financial_year = '2026-27';

      INSERT INTO public.accounting_control_items
        (financial_year, particulars, account_type, review_frequency,
         party_name, responsible_person, client_id)
      VALUES
        ('2026-27', next_particular, '', 'Not set', NEW.name, 'Unassigned', NEW.id)
      ON CONFLICT DO NOTHING;
    ELSE
      UPDATE public.accounting_control_items
      SET party_name = NEW.name, updated_at = NOW()
      WHERE financial_year = '2026-27' AND client_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_accounting_control_item ON public.clients;
CREATE TRIGGER sync_accounting_control_item
  AFTER INSERT OR UPDATE OF name, selected_services, discontinued_services
  ON public.clients FOR EACH ROW
  EXECUTE FUNCTION public.sync_accounting_control_item();

-- Create control rows for Accounting services that were already explicitly
-- selected but were not one of the exact spreadsheet-name matches.
WITH base AS (
  SELECT COALESCE(MAX(particulars), 0) AS last_particular
  FROM public.accounting_control_items
  WHERE financial_year = '2026-27'
), missing AS (
  SELECT c.id, c.name, row_number() OVER (ORDER BY c.name, c.id) AS offset
  FROM public.clients c
  WHERE 'accountingFees' = ANY(c.selected_services)
    AND NOT ('accountingFees' = ANY(COALESCE(c.discontinued_services, '{}'::text[])))
    AND NOT EXISTS (
      SELECT 1 FROM public.accounting_control_items a
      WHERE a.financial_year = '2026-27' AND a.client_id = c.id
    )
)
INSERT INTO public.accounting_control_items
  (financial_year, particulars, account_type, review_frequency,
   party_name, responsible_person, client_id)
SELECT '2026-27', base.last_particular + missing.offset, '', 'Not set',
       missing.name, 'Unassigned', missing.id
FROM missing CROSS JOIN base
ON CONFLICT DO NOTHING;

COMMIT;
