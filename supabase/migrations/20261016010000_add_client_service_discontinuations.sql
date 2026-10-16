-- A client can stop one service while the firm continues the others.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS discontinued_services TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS service_discontinued_at JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_discontinued_services_check;
ALTER TABLE public.clients ADD CONSTRAINT clients_discontinued_services_check
  CHECK (discontinued_services <@ ARRAY[
    'itrFees', 'gstFees', 'gstAnnualReturnFees', 'accountingFees', 'auditFees',
    'companyActFees', 'tdsFees', 'pfEsicPtLabourFees', 'consultancyFees'
  ]::TEXT[]);

