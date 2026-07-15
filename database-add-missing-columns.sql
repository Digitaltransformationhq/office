-- ============================================
-- ADD MISSING COLUMNS TO TASKS TABLE
-- ============================================
-- This migration adds the following columns:
-- 1. created_by - Name of user who created the task
-- 2. created_by_id - ID of user who created the task
-- 3. billing_fees - Fees amount for billing
-- 4. taxable_amount - Taxable amount for billing
-- 5. billing_description - Description for invoice

-- Add created_by columns
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS created_by TEXT,
ADD COLUMN IF NOT EXISTS created_by_id TEXT;

-- Add billing columns
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS billing_fees DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS taxable_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS billing_description TEXT;

-- Add foreign key constraint for created_by_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_created_by_id_fkey'
  ) THEN
    ALTER TABLE tasks
    ADD CONSTRAINT tasks_created_by_id_fkey
    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_created_by_id ON tasks(created_by_id);

-- Add comments to document the columns
COMMENT ON COLUMN tasks.created_by IS 'Name of the user who created this task';
COMMENT ON COLUMN tasks.created_by_id IS 'ID of the user who created this task';
COMMENT ON COLUMN tasks.billing_fees IS 'Billing fees amount in INR';
COMMENT ON COLUMN tasks.taxable_amount IS 'Taxable amount for GST calculation in INR';
COMMENT ON COLUMN tasks.billing_description IS 'Description to be included in the invoice';

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks'
AND column_name IN ('created_by', 'created_by_id', 'billing_fees', 'taxable_amount', 'billing_description')
ORDER BY column_name;
