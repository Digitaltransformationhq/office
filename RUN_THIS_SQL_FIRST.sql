-- ============================================
-- IMPORTANT: RUN THIS SQL IN SUPABASE FIRST
-- ============================================
-- This must be run before the billing workflow will work
-- Navigate to: Supabase Dashboard > SQL Editor > New Query
-- Copy this entire file, paste it, and click "Run"
-- ============================================

-- Drop the existing check constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Add the new check constraint with "Pending for Billing" and "Billed" included
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN (
    'Pending', 
    'In Progress', 
    'Completed', 
    'Overdue', 
    'Pending Approval', 
    'Pending for Billing', 
    'Billed'
  ));

-- Verify the constraint was added successfully
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'tasks_status_check';

-- Expected result:
-- constraint_name      | constraint_definition
-- ---------------------+--------------------------------------------------------
-- tasks_status_check   | CHECK (status = ANY (ARRAY['Pending'::text, ...]))
--
-- You should see all 7 status values listed above in the constraint definition
