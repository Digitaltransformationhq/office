BEGIN;

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS billed_by_id TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS billed_by_name TEXT;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_billed_by_id_fkey;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_billed_by_id_fkey
  FOREIGN KEY (billed_by_id) REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.tasks.billed_by_id IS
  'The user who raised the bill when this task entered Billed status.';
COMMENT ON COLUMN public.tasks.billed_by_name IS
  'Snapshot of the biller name for reports and historical display.';

COMMIT;
