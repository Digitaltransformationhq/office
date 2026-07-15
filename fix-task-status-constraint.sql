-- ============================================
-- Fix Task Status Constraint
-- Add "Pending for Billing" and "Billed" to allowed task statuses
-- ============================================

-- Run this in Supabase SQL Editor
-- Navigate to: Supabase Dashboard > SQL Editor > New Query

-- Drop the existing check constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Add the new check constraint with "Pending for Billing" and "Billed" included
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Overdue', 'Pending Approval', 'Pending for Billing', 'Billed'));

-- Verify the constraint was added successfully
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'tasks_status_check';
