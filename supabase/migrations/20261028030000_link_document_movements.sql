BEGIN;

ALTER TABLE public.document_movements
  ADD COLUMN IF NOT EXISTS source_in_id BIGINT;

ALTER TABLE public.document_movements
  DROP CONSTRAINT IF EXISTS document_movements_source_in_id_fkey;

ALTER TABLE public.document_movements
  ADD CONSTRAINT document_movements_source_in_id_fkey
  FOREIGN KEY (source_in_id) REFERENCES public.document_movements(id) ON DELETE SET NULL;

ALTER TABLE public.document_movements
  DROP CONSTRAINT IF EXISTS document_movements_source_only_for_out;

ALTER TABLE public.document_movements
  ADD CONSTRAINT document_movements_source_only_for_out
  CHECK (direction = 'OUT' OR source_in_id IS NULL);

CREATE UNIQUE INDEX IF NOT EXISTS idx_document_movements_one_out_per_in
  ON public.document_movements (source_in_id)
  WHERE source_in_id IS NOT NULL;

COMMENT ON COLUMN public.document_movements.source_in_id IS
  'The unmatched IN record closed by this OUT movement; null for manual OUT records.';

COMMIT;
