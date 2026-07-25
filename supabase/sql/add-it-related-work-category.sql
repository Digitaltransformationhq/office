-- Adds 'IT Related Work' to the allowed task categories.
--
-- Run this in the Supabase SQL editor. Safe to re-run.
--
-- THE PROBLEM
--
-- tasks.category carries a CHECK constraint listing the eleven original
-- categories. The frontend now offers 'IT Related Work' as a twelfth option, but
-- until this constraint is widened every attempt to create or edit a task in that
-- category fails the INSERT/UPDATE. schema.sql is CREATE TABLE IF NOT EXISTS, so
-- it never re-runs against an existing table — the constraint must be swapped
-- explicitly here.

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_category_check;

ALTER TABLE tasks ADD CONSTRAINT tasks_category_check
  CHECK (category IN ('Income Tax', 'GST', 'Audit', 'Certification', 'Project Finance', 'Accounts', 'Advisory', 'Office Work', 'Consultancy', 'Litigation', 'MCA Work', 'IT Related Work'));
