BEGIN;

ALTER TABLE public.accounting_control_items
  ADD COLUMN IF NOT EXISTS monthly_checks JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.accounting_control_items
  DROP CONSTRAINT IF EXISTS accounting_control_items_monthly_checks_object;

ALTER TABLE public.accounting_control_items
  ADD CONSTRAINT accounting_control_items_monthly_checks_object
  CHECK (jsonb_typeof(monthly_checks) = 'object');

COMMENT ON COLUMN public.accounting_control_items.monthly_checks IS
  'Per-month Sales, Purchase, Bank and Suspense completion flags, keyed by YYYY-MM.';

CREATE OR REPLACE FUNCTION public.set_accounting_monthly_check(
  p_item_id BIGINT,
  p_month TEXT,
  p_field TEXT,
  p_value BOOLEAN
)
RETURNS public.accounting_control_items
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  updated_item public.accounting_control_items;
BEGIN
  IF p_month !~ '^\d{4}-(0[1-9]|1[0-2])$'
     OR p_field NOT IN ('sales', 'purchase', 'bank', 'suspense') THEN
    RAISE EXCEPTION 'Invalid monthly accounting check';
  END IF;

  UPDATE public.accounting_control_items
  SET monthly_checks = monthly_checks || jsonb_build_object(
        p_month,
        COALESCE(monthly_checks -> p_month, '{}'::jsonb) || jsonb_build_object(p_field, p_value)
      ),
      updated_at = NOW()
  WHERE id = p_item_id
  RETURNING * INTO updated_item;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Accounting control item not found';
  END IF;

  RETURN updated_item;
END;
$$;

COMMIT;
